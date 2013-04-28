package models

import akka.actor._
import scala.concurrent.Future
import scala.concurrent.duration._

import play.api.Logger
import play.api._
import play.api.libs.json._
import play.api.libs.iteratee._
import play.api.libs.concurrent._

import akka.util.Timeout
import akka.pattern.ask

import play.api.Play.current
import play.api.libs.concurrent.Execution.Implicits._

object Game {
  implicit val timeout = Timeout(1 second)
  
  val default = {
    val gameActor = Akka.system.actorOf(Props[Game])
    gameActor
  }

  def join(username:String): Future[(Iteratee[JsValue,_],Enumerator[JsValue])] = {

    (default ? Join(username)).map {
      
      case Connected(enumerator) => 
        val iteratee = Iteratee.foreach[JsValue] { event =>
          default ! UserMessage(username, (event \ "k").as[String], event \ "m")
        }.mapDone { _ =>
          default ! Quit(username)
        }

        (iteratee, enumerator)
        
      case CannotConnect(error) => 
        val iteratee = Done[JsValue,Unit]((),Input.EOF)
        val enumerator =  Enumerator[JsValue](JsObject(Seq("error" -> JsString(error)))).andThen(Enumerator.enumInput(Input.EOF))
        (iteratee, enumerator)
         
    }

  }
  
}

case class RealPosition (x: Double, y: Double) {
  def toPosition() = Position(math.floor(x).toInt, math.floor(y).toInt)
}

object RealPosition {
  implicit val format = Json.format[RealPosition]
}


case class Position (x: Long, y: Long) {
  def + (p: Position) = Position(x+p.x, y+p.y)
}

object Position {
  implicit val format = Json.format[Position]
}

class Player (username: String, var position: Position, game: ActorRef, channel: Concurrent.Channel[JsValue]) extends Actor {

  def receive = {

    case "getPosition" => {
      sender ! position
    }

    case m @ UserMessage(username, kind, msg) => {
      kind match {
        case "move" => 
          Json.fromJson[Position](msg) map { position =>
            self ! Move(position)
          }

        case "subscribe_chunk" =>
          Json.fromJson[Position](msg) map { position =>
            game ! SubscribeChunk(self, position)
          }

        case "unsubscribe_chunk" =>
          Json.fromJson[Position](msg) map { position =>
            game ! UnsubscribeChunk(self, position)
          }

        case _ =>
          Logger.debug("unsupported: "+m)
      }
    }

    case InitPlayer(position) => {
      this.position = position
      game ! NewPosition(username, position)
    }

    case Move(p) => {
      this.position = p
      game ! NewPosition(username, p)
    }
  }
}

object Chunk {
  val SIZE = 512L
}

class Seed (value: Long) {
  def getSpawnPosition (): Position = {
    Position(100, 100)
  }
}

sealed abstract class Tile(p: Position)
case class EmptyBlock(p: Position) extends Tile(p)
case class Block(p: Position, force: Long) extends Tile(p)

object EmptyBlock {
  implicit val format = Json.format[EmptyBlock]
}
object Block {
  implicit val format = Json.format[Block]
}

class Chunk (origin: Position, gameRef: ActorRef) extends Actor {
  var subscribers = Set.empty[ActorRef]
  var tiles = Set.empty[Tile]

  def inside (p: Position) = {
    origin.x <= p.x && origin.y <= p.y && p.x < origin.x + Chunk.SIZE && p.y < origin.y + Chunk.SIZE;
  }

  def spawnTiles (p: Position) = List[Tile](
    EmptyBlock(p + Position(-1, -1)),
    EmptyBlock(p + Position(-1,  0)),
    EmptyBlock(p + Position(-1,  1)),
    EmptyBlock(p + Position( 0, -1)),
    EmptyBlock(p + Position( 0,  0)),
    EmptyBlock(p + Position( 0,  1)),
    EmptyBlock(p + Position( 1, -1)),
    EmptyBlock(p + Position( 1,  0)),
    EmptyBlock(p + Position( 1,  1))
  )

  def receive = {
    case InitChunk(seed) =>
      val spawn = seed.getSpawnPosition()
      if (inside(spawn)) {
        tiles = tiles ++ spawnTiles(spawn)
      }
    
    case SubscribeChunk(actor, _) =>
      subscribers = subscribers + actor
    
    case UnsubscribeChunk(actor, _) =>
      subscribers = subscribers - actor
  }
}

case class SubscribeChunk (actor: ActorRef, p: Position)
case class UnsubscribeChunk (actor: ActorRef, p: Position)

case class InitChunk (seed: Seed)

case class GetChunk(position: Position)

class Game extends Actor {
  implicit val timeout = Timeout(1 second)
  
  var members = Map.empty[String, ActorRef]
  var chunks = Map.empty[Position, ActorRef]

  val (gameEnumerator, gameChannel) = Concurrent.broadcast[JsValue]

  val seed = new Seed(0L)

  def playerInfos: Future[Map[String, JsValue]] = {
    Future.sequence(members.toList map { case (username, actor) =>
      (actor ? "getPosition") map { case position: Position =>
        (username, Json.toJson(position))
      }
    }).map(_.toMap)
  }

  def receive = {
    
    case m @ UserMessage(username, kind, msg) => {
      members.get(username).map { player =>
        player ! m
      }
    }

    case s @ SubscribeChunk(_, p) => {
      (self ? GetChunk(p)) map { case chunk: ActorRef =>
        chunk ! s
      }
    }

    case s @ UnsubscribeChunk(_, p) => {
      (self ? GetChunk(p)) map { case chunk: ActorRef =>
        chunk ! s
      }
    }

    case Join(username) => {
      if(members.contains(username)) {
        sender ! CannotConnect("username_exists")
      } else {
        val position = seed.getSpawnPosition()
        val gameInfosEnumerator: Enumerator[JsValue] = 
          Enumerator.flatten(playerInfos map { playerInfos => 
            Enumerator(Json.obj(
              "k" -> "init",
              "m" -> Json.obj(
                "position" -> position,
                "players" -> playerInfos
              )
            ))
          })
        val playerEnumerator = Concurrent.unicast[JsValue] { playerChannel =>
          val player = Akka.system.actorOf(Props(new Player(username, position, self, playerChannel)))
          members = members + (username -> player)
        }
        sender ! Connected(
          gameInfosEnumerator >>>  
          playerEnumerator >-
          gameEnumerator)
        self ! NotifyJoin(username, position)
      }
    }

    case GetChunk (p) => {
      val chunkPosition = Position(p.x % Chunk.SIZE, p.y % Chunk.SIZE)
      val chunk =
        if (chunks contains chunkPosition)
          chunks(chunkPosition)
        else {
          val chunk = Akka.system.actorOf(Props(new Chunk(chunkPosition, self)))
          (chunk ? InitChunk(seed)) map { case _ =>
            chunks = chunks + (chunkPosition -> chunk)
          }
          chunk
        }
      sender ! chunk
    }

    case NewPosition(username, position) =>
      notifyAll("position", username, Json.toJson(position))

    case NotifyJoin(username, position) =>
      notifyAll("join", username, Json.toJson(position))
    
    case Quit(username) => 
      members = members - username
      notifyAll("quit", username, JsString(username))
    
  }
  
  def notifyAll(kind: String, user: String, message: JsValue) {
    val msg = JsObject(
      Seq(
        "k" -> JsString(kind),
        "u" -> JsString(user),
        "m" -> message
      )
    )
    gameChannel.push(msg)
  }
  
}

case class UserMessage (username: String, kind: String, msg: JsValue)

case class InitPlayer (position: Position)
case class Move (position: Position)
case class NewPosition (username: String, position: Position)
case class Join(username: String)
case class Quit(username: String)
case class NotifyJoin(username: String, position: Position)

case class Connected(enumerator:Enumerator[JsValue])
case class CannotConnect(msg: String)
