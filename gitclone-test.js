var Git = require("nodegit");
var opts = {
      remoteCallbacks: {
        certificateCheck: function() {
          return 1;
        }
      }
    };

Git.Clone("https://github.com/nodegit/nodegit", "nodegit", opts).then(function(repository) {
  // Work with the repository object here.
})
  .catch(function(err) { console.log(err); });
