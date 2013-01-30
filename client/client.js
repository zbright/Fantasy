Meteor.subscribe("directory");

Meteor.autorun(function () {
    var user = Meteor.user();
    if (!user)
        return false;

    Meteor.call('checkTokenValidity', function (err, response) {
        if (err) {
            //TODO handle error
            console.log("token issues");
            return;
        }

        Session.set("linkRequired", !response);
    });
});

Template.home.linkYahoo = function () {
    return Session.get("linkRequired");
};

Template.link.events({
    'click input':function () {
        Meteor.call('requestAccessUrl', function (err, response) {
            if (err) {
                console.log(err);
            }

            window.open(response, '_blank')
        });
    }
});
  
//  Template.hello.tops = function() {
//      Meteor.call('getEspnHeadlines', function(err, response) {
//              if(err) {
//                  console.log(err);
//              }
//              var headlines = response['data']['headlines'];
//
//              headlines.forEach(function(h) {
//                  console.log(h.title);
//              })
//
//              console.log(headlines);
//          }
//      )
//
//  };

Meteor.Router.add({
    '/close':function () {
        Meteor.call('getAccessToken', function (err, response) {
            if (err) {
                console.log("this error");

                console.log(err);
            }
        });

        window.close();
    }
});