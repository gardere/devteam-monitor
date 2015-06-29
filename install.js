var fs = require("fs");
var file = "devteambot.sqlite";
var exists = fs.existsSync(file);
var sqlite3 = require("sqlite3").verbose();
var readline = require('readline');
var q = require('q');
var db;

function createDbIfNecessary() {
  var deferred = q.defer();

  if (!exists) {
    console.log("Creating DB file.");
    fs.openSync(file, "w");
  }

  db = new sqlite3.Database(file);

  if (!exists) {
    db.run('CREATE TABLE `developer` ( `developer_id`	INTEGER PRIMARY KEY AUTOINCREMENT, `developer_name`	TEXT, `developer_nick_name`	TEXT, `developer_avatar`	BLOB, `developer_git_aliases`	TEXT, `developer_jira_id`	TEXT);');
    db.run('CREATE TABLE `jira_project` ( `jira_project_id`	INTEGER PRIMARY KEY AUTOINCREMENT, `jira_project_name`	TEXT, `jira_project_key`	TEXT)');
    db.run('CREATE TABLE `repository` ( `repository_id`	INTEGER PRIMARY KEY AUTOINCREMENT, `repository_name`	TEXT, `repository_url`	TEXT );');
    deferred.resolve();
  } else {
    deferred.resolve();
  }

  return deferred.promise;
}


function registerJIRAprojects() {
  var deferred = q.defer();

  console.log('\nJIRA projects');
  console.log('Please enter the names of JIRA projects you wish to monitor.');
  console.log('One per line, press [RETURN]/[ENTER] after each one. Terminate with a blank line');
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', function(line) {
    if (line === '') {
      rl.close();
      deferred.resolve();
    } else {
      db.run('INSERT INTO `jira_project` (`jira_project_key`, `jira_project_name`) values (\'' + line + '\', \'' + line + '\')');
    }
  });

  return deferred.promise;
}

function getDevPromiseLoop() {
  return getDev().
  then(function(dev) {
    if (dev === null) {
      return null;
    } else {
      db.run('INSERT INTO `developer` (`developer_name`, `developer_nick_name`, `developer_git_aliases`, `developer_jira_id`) values (\'' + dev.developer_name + '\', \'' + dev.developer_nick_name + '\', \'' + dev.developer_git_aliases + '\', \'' + dev.developer_jira_id + '\')');
      return getDevPromiseLoop();
    }
  });
}

function registerDevs() {
  console.log('\n\nDevs\n');
  return getDevPromiseLoop();
}

function getDev() {
  var deferred = q.defer();
  var newDev = {};
  var currentLine = 'developer_name';
  var prompt;
  var nextLine;

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  console.log('\nDeveloper Name:');

  rl.on('line', function(line) {
    switch (currentLine) {
      case 'developer_name':
        if (line === '') {
          deferred.resolve(null);
          rl.close();
        }
        prompt = 'Nick Name (empty name to finish)';
        nextLine = 'developer_nick_name';
        break;
      case 'developer_nick_name':
        prompt = 'JIRA Id';
        nextLine = 'developer_jira_id';
        break;
      case 'developer_jira_id':
        prompt = 'Git aliases (comma separated list)';
        nextLine = 'developer_git_aliases';
        break;
      case 'developer_git_aliases':
        prompt = null;
        nextLine = null;
        break;
      default:
        break;
    }

    newDev[currentLine] = line;
    currentLine = nextLine;
    if (prompt !== null) {
      console.log(prompt);
    }
    if (currentLine == null) {
      deferred.resolve(newDev);
    }
  });

  return deferred.promise;
}

createDbIfNecessary().
then(registerJIRAprojects).
then(registerDevs).
then(db.close);
