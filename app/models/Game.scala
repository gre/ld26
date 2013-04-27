package models

import akka.actor._
import scala.concurrent._
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
      
      case Connected(prependEnumerator, enumerator) => 
        val iteratee = Iteratee.foreach[JsValue] { event =>
          event match {
            case JsArray(events) => events.map { e =>
              default ! UserMessage(username, (e \ "k").as[String], e \ "m")
            }
            case e => 
              default ! UserMessage(username, (e \ "k").as[String], e \ "m")
          }
        }.mapDone { _ =>
          default ! Quit(username)
        }

        (iteratee, prependEnumerator >>> enumerator)
        
      case CannotConnect(error) => 
        val iteratee = Done[JsValue,Unit]((),Input.EOF)
        val enumerator =  Enumerator[JsValue](JsObject(Seq("error" -> JsString(error)))).andThen(Enumerator.enumInput(Input.EOF))
        (iteratee, enumerator)
         
    }

  }
  
}

class Player (username: String) extends Actor {
  var x = 0L
  var y = 0L

  def receive = {
    case InitPlayer(x, y) => {
      this.x = x
      this.y = y
      sender ! NewPosition(username, x, y)
    }
    case Move(x, y) => {
      println(username, "move", x, y)
      this.x = x
      this.y = y
      sender ! NewPosition(username, x, y)
    }
  }
}


class Game extends Actor {
  
  var members = Map.empty[String, ActorRef]
  val (gameEnumerator, gameChannel) = Concurrent.broadcast[JsValue]

  def receive = {
    
    case UserMessage(username, kind, msg) => {
      var player = members(username)
      (kind, msg) match {
        case ("ready", _) =>
          player ! InitPlayer(100, 100)

        case ("move", JsObject(pos)) => 
          ((msg\"x").asOpt[Long], (msg\"y").asOpt[Long]) match { case (Some(x), Some(y)) =>
          player ! Move(x, y)
        }

        case _ => {
        }
      }
    }

    case Join(username) => {
      if(members.contains(username)) {
        sender ! CannotConnect("username_exists")
      } else {
        val player = Akka.system.actorOf(Props(new Player(username)))
        members = members + (username -> player)
        val gameInfosEnumerator: Enumerator[JsValue] = Enumerator(Json.obj(
          "k" -> "init",
          "m" -> Json.obj("players" -> Json.arr())
        ))
        sender ! Connected(gameInfosEnumerator, gameEnumerator)
        self ! NotifyJoin(username)
      }
    }

    case NewPosition(username: String, x: Long, y: Long) => {
      notifyAll("position", username, Json.obj("x" -> JsNumber(x), "y" -> JsNumber(y)))
    }

    case NotifyJoin(username) => {
      notifyAll("join", username, JsString(username))
    }
    
    case Quit(username) => {
      members = members - username
      notifyAll("quit", username, JsString(username))
    }
    
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

case class InitPlayer (x: Long, y: Long)
case class Move (x: Long, y: Long)
case class NewPosition (username: String, x: Long, y: Long)

case class Join(username: String)
case class Quit(username: String)
case class NotifyJoin(username: String)

case class Connected(prependEnumerator: Enumerator[JsValue], enumerator:Enumerator[JsValue])
case class CannotConnect(msg: String)
