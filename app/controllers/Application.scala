package controllers

import play.api._
import play.api.mvc._

import play.api.libs.iteratee._
import play.api.libs.json._

import models._

object Application extends Controller {
  
  def index = Action { implicit request =>
    Ok(views.html.index())
  }

  // TODO
  def socket(username: String) = WebSocket.async[JsValue] { request =>
    Game.join(username)
  }
  
}
