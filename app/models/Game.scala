package models

import akka.actor._
import scala.concurrent.Future
import scala.concurrent.duration._

import play.api.Logger
import play.api._
import play.api.libs.json._
import play.api.libs.iteratee._
import play.api.libs.concurrent._
import play.api.libs.functional.syntax._

import akka.util.Timeout
import akka.pattern.ask

import play.api.Play.current
import play.api.libs.concurrent.Execution.Implicits._

object Game {
  val TOUCH_INTERVAL = 2000
  val CIRCLE_DIST = 0.05
  val CIRCLE_DIST2 = CIRCLE_DIST * CIRCLE_DIST

  implicit val timeout = Timeout(1 second)

  val default = Akka.system.actorOf(Props[Game])

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

case class Position (x: Double, y: Double) {
  def + (p: Position) = Position(x+p.x, y+p.y)
  def dist2 (p: Position) = {
    val dx = p.x - x
    val dy = p.y - y
    dx*dx+dy*dy
  }
}

object Position {
  implicit val format = Json.format[Position]
}


case class PlayerData (position: Position, score: Long, lastTouch: Long)

object PlayerData {
  implicit val format = Json.format[PlayerData]
}

class Player (
  username: String, 
  var position: Position, 
  game: ActorRef, 
  channel: Concurrent.Channel[JsValue]) extends Actor {

  var score = 0L
  var lastTouch = 0L

  def getPlayerData = 
    PlayerData(position, score, lastTouch)

  def receive = {

    case "getData" =>
      sender ! getPlayerData

    case "score" =>
      score = score + 1
      game ! NewPlayerData(username, getPlayerData)

    case "touched" =>
      score = math.max(0, score - 1)
      lastTouch = System.currentTimeMillis()
      game ! Touched(username)
      game ! NewPlayerData(username, getPlayerData)

    case Move(position) => {
      this.position = position
      game ! NewPlayerData(username, getPlayerData)
    }

  }
}

class Game extends Actor {
  implicit val timeout = Timeout(1 second)
  
  var members = Map.empty[String, ActorRef]

  val (gameEnumerator, gameChannel) = Concurrent.broadcast[JsValue]

  def playerInfos: Future[Map[String, PlayerData]] = {
    Future.sequence(members.toList map { case (username, actor) =>
      (actor ? "getData") map { case playerData: PlayerData =>
        (username, playerData)
      }
    }).map(_.toMap)
  }

  def receive = {
    
    case m @ UserMessage(username, kind, msg) => {
      members.get(username).map { player =>
        kind match {

          case "move" => 
            Json.fromJson[Position](msg) map { case position =>
              player ! Move(position)
            }

          case "touch" =>
            Json.fromJson[String](msg) map { case victim =>
              members.get(victim) map { other =>
                (other ? "getData") map { case otherData: PlayerData =>
                  (player ? "getData") map { case playerData: PlayerData =>
                    if (otherData.lastTouch < System.currentTimeMillis() - Game.TOUCH_INTERVAL
                      && otherData.position.dist2(playerData.position) < Game.CIRCLE_DIST2) {
                      other ! "touched"
                      player ! "score"
                    }
                  }
                }
              }
            }

          case _ =>
            Logger.debug("unsupported: "+m)
        }
      }
    }

    case Join(username) => {
      if(members.contains(username)) {
        sender ! CannotConnect("username_exists")
      } else {
        val gameInfosEnumerator: Enumerator[JsValue] = 
          Enumerator.flatten(playerInfos map { playerInfos => 
            Enumerator(Json.obj(
              "k" -> "init",
              "m" -> Json.obj(
                "players" -> playerInfos
              )
            ))
          })
        val playerEnumerator = Concurrent.unicast[JsValue] { playerChannel =>
          val player = Akka.system.actorOf(Props(new Player(username, Position(-1.0, -1.0), self, playerChannel)))
          members = members + (username -> player)
          (player ? "getData") map { case data: PlayerData =>
            self ! NotifyJoin(username, data)
          }
        }
        sender ! Connected(
          gameInfosEnumerator >>>  
          playerEnumerator >-
          gameEnumerator)
      }
    }

    case Touched(username) =>
      notifyAll("touched", username, JsString(username))

    case NewPlayerData(username, data) =>
      notifyAll("player", username, Json.toJson(data))

    case NotifyJoin(username, data) =>
      notifyAll("join", username, Json.toJson(data))
    
    case Quit(username) => 
      members = members - username
      notifyAll("quit", username, JsString(username))
    
  }
  
  def notifyAll(kind: String, user: String, message: JsValue) {
    val msg = Json.obj(
      "k" -> JsString(kind),
      "u" -> JsString(user),
      "m" -> message
    )
    gameChannel.push(msg)
  }
  
}

case class UserMessage (username: String, kind: String, msg: JsValue)

case class Move (position: Position)
case class NewPlayerData (username: String, playerData: PlayerData)
case class Touched(username: String)
case class Join(username: String)
case class Quit(username: String)
case class NotifyJoin(username: String, playerData: PlayerData)

case class Connected(enumerator:Enumerator[JsValue])
case class CannotConnect(msg: String)
