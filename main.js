//var JiraApi = require('jira').JiraApi;

var config = {
	host: 'jira.fetchtv.com.au',
	port: 80,
	user: 'mathieu_gardere',
	password: 'i8the4kin$'
};

var http = require('http');
var moment = require('moment');
var _ = require('lodash');
var chalk = require('chalk');

var lastIssueTs = moment().startOf('day');
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
	console.log(chalk.underline('Reporter:') + ' ' + chalk.blue.inverse(reporter));
	console.log(chalk.underline('Assignee:') + ' ' + chalk.yellow.inverse(assignee));
	console.log(chalk.underline('Updated:') + ' ' + moment(updated).format('HH:mm:ss'));
	console.log(chalk.underline('Description:\n') + description);
};

function getIssues() {
	var jqlQueryString = encodeURIComponent('updatedDate > "' + moment(lastIssueTs).format('YYYY/MM/DD HH:mm') + '" AND status = "open"');

	var path = '/rest/api/latest/search?startAt=0&maxResults=5000&jql=' + jqlQueryString;
	var options = {
		method: 'GET',
		port: 80,
		host: 'jira.fetchtv.com.au',
		path: '/rest/api/latest/search?startAt=0&maxResults=5000&jql=' + jqlQueryString,
		'auth': config.user + ':' + config.password
	};

	var req = http.request(options, function (response) {
	  var body = '';
	  response.on('data', function(d) {
	      body += d;
	  });
		response.on('end', function() {
			var JSONresp = JSON.parse(body);
			var numberOfIssues = JSONresp.total;

			if (numberOfIssues > 0) {
				var maxTs = _(JSONresp.issues).pluck('fields').pluck('updated').max(function (sDate) { return +(new Date(sDate)); } );

				console.log(chalk.bold.red('\n\n\n' + numberOfIssues + ' issues updated since ' + moment(lastIssueTs).format('DD/MM HH:mm:ss')));

				_.forEach(JSONresp.issues, displayIssueDetails);
				if (maxTs) {
					lastIssueTs = moment(maxTs).valueOf() + 60000;
				}
			} else {
				console.log('.');
			}

			setTimeout(getIssues, 15000);
	  });
		response.on('error', function() {
			console.log('/' + error);
		setTimeout(getIssues, 15000);
	  });
	});

	req.end();
};

getIssues();
