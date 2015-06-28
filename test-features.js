var open = require("nodegit").Repository.open;
var q = require('q');
var ops = [];

var authorStats = {
};

// Open the repository directory.
open("/Users/mathieu/Documents/projects/aotg/aotg-ios")
  // Open the master branch.
  .then(function(repo) {
    return repo.getReferenceCommit('dev');
  })
  // Display information about commits on master.
  .then(function(firstCommitOnMaster) {
    // Create a new history event emitter.
    var history = firstCommitOnMaster.history();

    // Create a counter to only show up to 9 entries.
    var count = 0;

    // Listen for commit events from the history.
    history.on("commit", function(commit) {
      if (commit.message().substring(0, 5) !== 'Merge') {
        // Disregard commits past 9.
        if (++count == 8000) {
          showSummary();
        } else if (count > 8000){
          return;
        }

        ops.push(showDiff(commit)
        .then(function (patchDetails) {
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

  function showSummary() {
    return q.all(ops).
    then(function () {
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
