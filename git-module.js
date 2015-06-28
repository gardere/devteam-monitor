var gitOpen = require("nodegit").Repository.open;
var gitClone = require("nodegit").Clone.clone;
var _ = require('lodash');
var q = require('q');
var ops = [];
var fs = require('fs');
var path = require('path');
var localCheckoutDir = './git_temp';
var cred;
var opts = {
      remoteCallbacks: {
        certificateCheck: function() {
          return 1;
        }
      }
    };

var authorStats = {};

function computeStats() {
  gitOpen("/Users/mathieu/Documents/projects/aotg/aotg-ios")
    .then(function(repo) {
      return repo.getReferenceCommit('dev');
    })
    .then(function(firstCommitOnMaster) {
      var history = firstCommitOnMaster.history();
      var count = 0;

      history.on("commit", function(commit) {
        if (commit.message().substring(0, 5) !== 'Merge') {
          if (++count == 8000) { //TODO change with a different limit (when we get to yesterday's commit?)
            showSummary();
          } else if (count > 8000) { //TODO change with a different limit (when we get to yesterday's commit?)
            return;
          }

          ops.push(showDiff(commit)
            .then(function(patchDetails) {
              var author = commit.author();
              addAuthorStats(author.name(), patchDetails);
            }));
        }
      });

      history.on("end", function() {
        console.log(count + ' commits');
        showSummary();
      });

      // Start emitting events.
      history.start();
    });
}

function showSummary() {
  return q.all(ops).
  then(function() {
    console.log(authorStats);
  });
}

function addAuthorStats(name, stats) {
  if (typeof authorStats[name] === 'undefined') {
    authorStats[name] = {
      added: 0,
      deleted: 0
    };
  }

  authorStats[name].added += stats.added;
  authorStats[name].deleted += stats.deleted;
}


function showDiff(commit) {
  var added = 0;
  var deleted = 0;
  return commit.getDiff().
  then(function(diffList) {
    diffList.forEach(function(diff) {
      diff.patches().forEach(function(patch) {
        patch.hunks().forEach(function(hunk) {
          hunk.lines().forEach(function(line) {
            var char = String.fromCharCode(line.origin());
            if (char === "+") {
              added++;
            } else if (char === "-") {
              deleted++;
            }
          });

        });
      });
    });
    return {
      added: added,
      deleted: deleted
    };
  });
}

function checkLocalCheckoutFolder() {
  if (!fs.existsSync(localCheckoutDir)) {
    fs.mkdirSync(localCheckoutDir);
  }
}

function start(config) {
  checkLocalCheckoutFolder();

  opts.remoteCallbacks.credentials = function () {
    return require("nodegit").Cred.userpassPlaintextNew(config.git_login, config.git_password);
  };

  _.forEach(config.gitRepositories, function (repository) {
    return checkRepository(repository, config).
    then(_.partial(pullChanges, repository));
  });

  return config;
}

function checkRepository(repo, config) {
  var repoPath = path.join(localCheckoutDir, repo.name);
  if (!fs.existsSync(repoPath)) {
    var url = repo.url.replace('http://', 'http://' + encodeURIComponent(config.git_login) + ':' + encodeURIComponent(config.git_password) + '@');
    return gitClone(url, repoPath, opts).
    catch(function (err) {
      console.log('error cloning repo ' + repo.name + ' : ' + err);
    });
  } else {
    console.log('path exists');
    return q.when(true);
  }
}

function pullChanges() {
  console.log('pulling change for ' +  + repo.name)
}

module.exports.start = start;
