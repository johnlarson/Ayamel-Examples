package models

import anorm.{~, Pk}
import anorm.SqlParser._
import dataAccess.sqlTraits.{SQLSelectable, SQLDeletable, SQLSavable}
import play.api.db.DB
import play.api.Play.current

/**
 * Represents a user's request for permissions
 * @param id The id of the request
 * @param userId The id of the user making the request
 * @param reason The reason why the user wants a permission
 */
case class SitePermissionRequest(id: Pk[Long], userId: Long, permission: String, reason: String) extends SQLSavable with SQLDeletable {

  /**
   * Saves the request to the DB
   * @return The possibly modified request
   */
  def save: SitePermissionRequest = {
    if (id.isDefined) {
      update(SitePermissionRequest.tableName, 'id -> id, 'userId -> userId, 'permission -> permission, 'reason -> reason)
      this
    } else {
      val id = insert(SitePermissionRequest.tableName, 'userId -> userId, 'permission -> permission, 'reason -> reason)
      this.copy(id)
    }
  }

  /**
   * Deletes the request from the DB
   */
  def delete() {
    delete(SitePermissionRequest.tableName, id)
  }

  //                  _   _
  //        /\       | | (_)
  //       /  \   ___| |_ _  ___  _ __  ___
  //      / /\ \ / __| __| |/ _ \| '_ \/ __|
  //     / ____ \ (__| |_| | (_) | | | \__ \
  //    /_/    \_\___|\__|_|\___/|_| |_|___/
  //
  //   ______ ______ ______ ______ ______ ______ ______ ______ ______
  // |______|______|______|______|______|______|______|______|______|
  //

  def approve() {
    getUser.foreach { user =>
		user.addSitePermission(this.permission)
		user.sendNotification("Your request for " + getDescription + " permission has been approved.")
	}
    delete()
  }

  def deny() {
    getUser.foreach(_.sendNotification("Sorry, but your request for " + getDescription + " permission has been denied."))
    delete()
  }

  //       _____      _   _
  //      / ____|    | | | |
  //     | |  __  ___| |_| |_ ___ _ __ ___
  //     | | |_ |/ _ \ __| __/ _ \ '__/ __|
  //     | |__| |  __/ |_| ||  __/ |  \__ \
  //      \_____|\___|\__|\__\___|_|  |___/
  //
  //   ______ ______ ______ ______ ______ ______ ______ ______ ______
  // |______|______|______|______|______|______|______|______|______|
  //

  object cache {
    var user: Option[User] = None

    def getUser = {
      if (user.isEmpty)
        user = User.findById(userId)
      user
    }
  }

  /**
   * Returns the user make this request
   * @return The user
   */
  def getUser: Option[User] = cache.getUser
  
  def getDescription: String = SitePermissions.getDescription(this.permission)

}

object SitePermissionRequest extends SQLSelectable[SitePermissionRequest] {
  val tableName = "sitePermissionRequest"

  val simple = {
    get[Pk[Long]](tableName + ".id") ~
      get[Long](tableName + ".userId") ~
      get[String](tableName + ".permission") ~
      get[String](tableName + ".reason") map {
      case id~userId~permission~reason => SitePermissionRequest(id, userId, permission, reason)
    }
  }

  /**
   * Finds a request by the id
   * @param id The id of the request
   * @return If a request was found, then Some[SitePermissionRequest], otherwise None
   */
  def findById(id: Long): Option[SitePermissionRequest] = findById(tableName, id, simple)

  /**
   * Finds requests by the requesting user
   * @param user The user who made the request
   * @return a possibly-empty list of permission requests
   */
  def listByUser(user: User): List[SitePermissionRequest] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where userId = {id}").on('id -> user.id).as(simple *)
    }

  /**
   * Finds a particular request by the requesting user
   * @param user The user who made the request
   * @param permission The permission requested
   * @return an Some[SitePermissionRequest] if one was found
   */
  def findByUser(user: User, permission: String): Option[SitePermissionRequest] =
    DB.withConnection {
      implicit connection =>
        anorm.SQL("select * from " + tableName + " where userId = {id} and permission = {permission}")
		  .on('id -> user.id, 'permission -> permission).as(simple.singleOpt)
    }

  /**
   * Lists all requests
   * @return The list of requests
   */
  def list: List[SitePermissionRequest] = list(tableName, simple)
}
