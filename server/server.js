var require = __meteor_bootstrap__.require;
var fs = require('fs');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var Future = require('fibers/future');
var OAuth = require('oauth').OAuth;

var yahooAuthUrl = "https://api.login.yahoo.com/oauth/v2/request_auth";

Meteor.publish("directory", function () {
    //TODO filter
    return Meteor.users.find();
});

var GetOAuthSession = function (callbackUrl) {
    return new OAuth("https://api.login.yahoo.com/oauth/v2/get_request_token",
        "https://api.login.yahoo.com/oauth/v2/get_token",
        "dj0yJmk9TVNnU3FBakFGakpOJmQ9WVdrOWRsUjZkRlZpTldVbWNHbzlOelF6T0RZek5EWXkmcz1jb25zdW1lcnNlY3JldCZ4PTZk",
        "f44a6514aa23a95b41176ac8cd83d73304b77011",
        "1.0",
        callbackUrl,
        "HMAC-SHA1");
};

var CheckTokenValidity =  function () {
    var user = Meteor.user();
    var response = false;

    if(!user || !user.services || !user.services.yahoo || !user.services.yahoo.yId ||
        !user.services.yahoo.oauth_access_token || !user.services.yahoo.oauth_access_token_secret){
        return response;
    }

    var user = Meteor.users.findOne({_id:userId});

    var oa = GetOAuthSession("http://localhost:3000/testAccess");

    oa.getOAuthAccessToken
        (
            user.services.yahoo.oauth_refresh_token,
            user.services.yahoo.oauth_token_secret,
            user.services.yahoo.oauth_verifier,
            function (error, oauth_access_token, oauth_access_token_secret, results) {
                if (error) {
                    console.log('error');
                    console.log(error);
                }
                else {
                    //TODO does it have to be in a fiber, test
                    // store the access token and remove the request token
                    Fiber(function () {
                        Meteor.users.update({_id:userId},
                            {$set:{
                                "services.yahoo.oauth_access_token": oauth_access_token,
                                "services.yahoo.oauth_access_token_secret":oauth_access_token_secret,
                                "services.yahoo.oauth_token":null,
                                "services.yahoo.oauth_token_secret":null,
                                "services.yahoo.oauth_refresh_token": results["oauth_session_handle"]
                            }}, callback);
                    }).run();
                }
            });
};

var GetAccessToken = function (userId, callback) {
    var user = Meteor.users.findOne({_id:userId});

    var oa = GetOAuthSession("http://localhost:3000/testAccess");

    oa.getOAuthAccessToken
        (
            user.services.yahoo.oauth_token,
            user.services.yahoo.oauth_token_secret,
            user.services.yahoo.oauth_verifier,
            function (error, oauth_access_token, oauth_access_token_secret, results) {
                if (error) {
                    console.log('error');
                    console.log(error);
                }
                else {
                    //TODO does it have to be in a fiber, test
                    // store the access token and remove the request token
                    Fiber(function () {
                        Meteor.users.update({_id:userId},
                            {$set:{
                                "services.yahoo.oauth_access_token": oauth_access_token,
                                "services.yahoo.oauth_access_token_secret":oauth_access_token_secret,
                                "services.yahoo.oauth_token":null,
                                "services.yahoo.oauth_token_secret":null,
                                "services.yahoo.oauth_refresh_token": results["oauth_session_handle"]
                            }}, callback);
                    }).run();
                }
            });
};

var GetRequestAccessUrl = function() {
    var user = Meteor.user();

    var future = new Future();

    var callbackUrl = "http://localhost:3000/test?userId=" + Meteor.userId();

    var oa = GetOAuthSession(callbackUrl);

    oa.getOAuthRequestToken(function (error, oauth_token, oauth_token_secret, results) {
        if (error) {
            console.log(error);
        }

        StoreRequestToken(user, oauth_token, oauth_token_secret);

        future.ret('https://api.login.yahoo.com/oauth/v2/request_auth?oauth_token=' + oauth_token);
    });

    return future.wait();
};

var StoreRequestToken = function(user, oauth_token, oauth_token_secret) {
    if (!user || !user.services.yahoo) {
        var yahoo = {
            oauth_token:oauth_token,
            oauth_token_secret:oauth_token_secret
        };

        Fiber(function () {
            Meteor.users.update(user,
                {$set:{
                    "services.yahoo":yahoo
                }})
        }).run();
    }
    else {
        Fiber(function () {
            Meteor.users.update(user,
                {$set:{
                    "services.yahoo.oauth_token":oauth_token,
                    "services.yahoo.oauth_token_secret":oauth_token_secret
                }})
        }).run();
    }
}

var LinkUser = function (userId, query, callback) {
    Meteor.users.update({_id:userId},
        {$set:{
            "services.yahoo.oauth_verifier": query["oauth_verifier"],
            "services.yahoo.yId": query["userId"]
        }}, callback);
};

Meteor.startup(function () {
    // code to run on server at startup
    Meteor.methods({
        //TODO: make this accept params such as dates, teams, players?, headlines(bool), etc
        //http://developer.espn.com/docs/headlines#parameters
        getEspnHeadlines: function() {
            var future = new Future();

            Meteor.http.get("http://api.espn.com/v1/fantasy/news/headlines?apikey=veux5pq7hfnvcxqnqk3dg6td", function (err, res) {
                //console.log(arr_from_json);

                future.ret(res);
            });

            return future.wait();
        },

        checkTokenValidity: CheckTokenValidity,

        requestAccessUrl: GetRequestAccessUrl
    });
});

Meteor.Router.add({
    '/test':function () {
        var query = this.request.query;

        var userId = query["userId"];

        LinkUser(userId, query, function () {
        });

        GetAccessToken(userId, function () {
        });

        return [302, {"Location":"/close"}, "My body"];
    }
});