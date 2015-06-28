var chalk = require('chalk');
var http = require('http');
var moment = require('moment');
var _ = require('lodash');

var lastUpdatedIssuesKeys = [];

var lastIssueTs = moment().startOf('day');
var lastResolutionTs = moment().startOf('day');
var unknown = {
  displayName: 'unknown'
};

function displayIssueDetails(issue) {
  var fields = issue.fields;
  var reporter = (fields.reporter || unknown).displayName;
  var assignee = (fields.assignee || unknown).displayName;
  var updated = fields.updated || _.now();
  var description = fields.description || chalk.italic('...no description...');
  console.log('\n------------------------------------------------------------------------------------------------------------------------------------------------\n');
  console.log(chalk.underline('Key:') + ' ' + chalk.green.inverse(issue.key));
  console.log(chalk.underline('Priority:') + ' ' + chalk.red.inverse(fields.priority.name));
  console.log(chalk.underline('Reporter:') + ' ' + chalk.blue.inverse(reporter));
  console.log(chalk.underline('Assignee:') + ' ' + chalk.yellow.inverse(assignee));
  console.log(chalk.underline('Updated:') + ' ' + moment(updated).format('HH:mm:ss'));
  console.log(chalk.underline('Status:') + ' ' + fields.status.name);
  console.log(chalk.underline('Description:\n') + description);
};

function getIssues(config) {
	var query = 'resolutiondate > "' + moment(lastResolutionTs).format('YYYY/MM/DD HH:mm') + '" OR updatedDate > "' + moment(lastIssueTs).format('YYYY/MM/DD HH:mm') + '"';
  var jqlQueryString = encodeURIComponent(query);

  var path = '/rest/api/latest/search?startAt=0&maxResults=5000&jql=' + jqlQueryString;
  var options = {
    method: 'GET',
    port: 80,
    host: 'jira.fetchtv.com.au',
    path: '/rest/api/latest/search?startAt=0&maxResults=5000&jql=' + jqlQueryString,
    'auth': config.user + ':' + config.password
  };

  var req = http.request(options, function(response) {
    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      processIssues(JSON.parse(body).issues || [], config);
      setTimeout(_.partial(getIssues, config), 15000);
    });
    response.on('error', function() {
      console.log('/' + error);
      setTimeout(_.partial(getIssues, config), 15000);
    });
  });

  req.end();
  return config;
};

function filterOutIrrelevantIssues(issues, config, lastUpdatedIssuesKeys) {
  return _.filter(issues, function(issue) {
    var project = issue.fields.project.key;
    var assignee = (issue.fields.assignee || {}).name;
    var test = config.validAssignees.contains(assignee) || config.validProjects.contains(project);
    test = test && !_(lastUpdatedIssuesKeys).contains(issue.key);
    return test;
  });
}

function processIssues(issues, config) {
  issues = filterOutIrrelevantIssues(issues, config, lastUpdatedIssuesKeys);
  if (issues.length > 0) {
    lastUpdatedIssuesKeys = _.pluck(issues, 'key');
    issues = _.sortBy(issues, 'fields.updated');

    var maxTs = _(issues).pluck('fields').pluck('updated').max(function(sDate) {
      return +(new Date(sDate));
    });

    var resolutionTs = _(issues).pluck('fields').pluck('resolutiondate').max(function(sDate) {
      return +(new Date(sDate));
    });

    console.log(chalk.bold.red('\n\n\n' + issues.length + ' issue(s) updated since ' + moment(lastIssueTs).format('DD/MM HH:mm:ss')));

    _.forEach(issues, displayIssueDetails);
    if (maxTs) {
      lastIssueTs = Math.max(moment(maxTs).valueOf(), lastIssueTs);
    }
    if (resolutionTs) {
      lastResolutionTs = Math.max(moment(resolutionTs).valueOf(), lastResolutionTs);
    }
  } else {
    console.log('.');
  }
}

module.exports.getIssues = getIssues;
