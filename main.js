var _ = require('lodash');
var sqlite3 = require('sqlite3')
var db;
var q = require('q');
var jiraModule = require('./jira-module.js')
var gitModule = require('./git-module.js')

function runQuery(query, rowProcessor) {
  var deferred = q.defer();

  db.each(query, rowProcessor, deferred.resolve);

  return deferred.promise;
}

function openDb() {
  var deferred = q.defer();

  db = new sqlite3.Database('./devteambot.sqlite', deferred.resolve);

  return deferred.promise;
}

function closeDb() {
  db.close();
}

function loadConfig() {
  config = require('./config.json');
  config.validAssignees = [];
  config.validProjects = [];
	config.gitRepositories = [];

  return runQuery("SELECT developer_jira_id FROM developer", function(err, row) {
    config.validAssignees.push(row.developer_jira_id);
  }).
	then(function() {
    return runQuery("SELECT jira_project_key FROM jira_project", function(err, row) {
      config.validProjects.push(row.jira_project_key);
    });
  }).then(function() {
    return runQuery("SELECT repository_name, repository_url FROM repository", function(err, row) {
      config.gitRepositories.push({
				name: row.repository_name,
				url: row.repository_url
			});
    });
  }).then(function() {
    config.validAssignees = _(config.validAssignees);
    config.validProjects = _(config.validProjects);
    return config;
  });
}

openDb().
then(loadConfig).
// then(jiraModule.getIssues).
then(gitModule.start);
