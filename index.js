var fs = require("fs");
var http = require("https");
var sqlite3 = require('sqlite3').verbose();
var dbFile = 'coc.db';
var db = new sqlite3.Database(dbFile);
var exists = fs.existsSync(dbFile);
var requestTimeId = 0;

// http://blog.modulus.io/nodejs-and-sqlite
// api.clashofclans.com/v1/clans/%23token
// http://dalelane.co.uk/blog/?p=3152
// https://github.com/mapbox/node-sqlite3/wiki/API
// http://stackoverflow.com/questions/18899828/best-practices-for-using-sqlite3-node-js

var options = {
    // https://set7z18fgf.execute-api.us-east-1.amazonaws.com/prod/?route=getClanDetails&clanTag=%23YVY20Y29
    host: 'set7z18fgf.execute-api.us-east-1.amazonaws.com',
    port: '443',
    path: '/prod/?route=getClanDetails&clanTag=%23YVY20Y29'
};

var createTables = function () {
    db.serialize(function () {
        // SELECT id, datetime(time.time, 'unixepoch', 'localtime') from time;

        db.run("CREATE TABLE if not exists member (\
        id                INTEGER PRIMARY KEY AUTOINCREMENT\
                                  UNIQUE\
                                  NOT NULL,\
        name              STRING,\
        role              STRING,\
        level             INTEGER,\
        trophies          INTEGER DEFAULT (0),\
        donations         INTEGER DEFAULT (0),\
        donationsReceived         DEFAULT (0),\
        clan_id           INTEGER REFERENCES clan (id) \
        );"
        );
        console.log("Created Table 'member'");

        db.run("CREATE TABLE  if not exists clan (\
        id    INTEGER PRIMARY KEY\
        UNIQUE\
        NOT NULL,\
            name  STRING,\
            token STRING,\
            type STRING,\
            description STRING,\
            location STRING,\
            warFrequency STRING,\
            level INTEGER,\
            warWins INTEGER,\
            clanPoints INTEGER,\
            requiredTrophies INTEGER,\
            members INTEGER,\
            date          UNIQUE\
        );"
        );
        console.log("Created Table 'clan'");

    });

}

var writeClanMemberToDB = function (clan, requestTime){
    //var start = new Date().getTime();
    //console.log("Start");

    db.serialize(function() {

        db.run("BEGIN TRANSACTION");
        clan.clanDetails.results.memberList.forEach(function(member){

                var stmt = db.prepare("INSERT INTO member (name, role, level, trophies, donations, donationsReceived, clan_id) VALUES (?, ?, ?, ?, ?, ?, ?)");

                data = [];
                data.push(member.name);
                data.push(member.role);
                data.push(member.expLevel);
                data.push(member.trophies);
                data.push(member.donations);
                data.push(member.donationsReceived);
                data.push(requestTime[1]);

                stmt.run(data);
                stmt.finalize();

                console.log(`Create entry for ${member.name} ; TimeID: ${requestTime[1]}`);

        });
        db.run("END");

    });
    //console.log("End");

    //var end = new Date().getTime();
    //console.log("Execution time: " + (end - start));

    console.log(`Clan ${clan.clanDetails.results.name} (${clan.clanDetails.results.tag}) written to DB at ${requestTime[0]}.`);

}

var prepareMemberInsert = function(writeMembers, clan, requestTime) {

    requestTime = [requestTime];

    db.get("SELECT id FROM clan WHERE clan.date = (?)", [requestTime[0]] , function(err, row) {
        //console.log(err_);
        if (err){
            // call your callback with the error
            writeMembers(err);
            return;
        }

        // call your callback with the data
        // console.log("row: " + JSON.stringify(row));
        requestTimeId = row.id;

        requestTime.push(requestTimeId);

        writeMembers(clan, requestTime);

    });
}


var writeClanToDB = function(clan, requestTime){

    db.serialize(function() {

        var stmt = db.prepare("INSERT INTO clan (name,\
                                token,\
                                type,\
                                description,\
                                location,\
                                warFrequency,\
                                level,\
                                warWins,\
                                clanPoints,\
                                requiredTrophies,\
                                members,\
                                date)\
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        data = [];
        data.push(clan.clanDetails.results.name);
        data.push(clan.clanDetails.results.tag);
        data.push(clan.clanDetails.results.type);
        data.push(clan.clanDetails.results.description);
        data.push(clan.clanDetails.results.locationName);
        data.push(clan.clanDetails.results.warFrequency);
        data.push(clan.clanDetails.results.clanLevel);
        data.push(clan.clanDetails.results.warWins);
        data.push(clan.clanDetails.results.clanPoints);
        data.push(clan.clanDetails.results.requiredTrophies);
        data.push(clan.clanDetails.results.members);
        data.push(requestTime);

        stmt.run(data, prepareMemberInsert(writeClanMemberToDB, clan, requestTime));
        stmt.finalize();

    });

}

var writeDataToDB = function(clan, requestTime) {

    db.serialize(function() {

        writeClanToDB(clan, requestTime);

    });


}

var getClanData = function(response) {
    var str = '';

    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function (chunk) {
        str += chunk;
    });

    //the whole response has been recieved, so we just print it out here
    response.on('end', function () {

        var requestTime = Math.floor(Date.now() / 1000);
        var data = JSON.parse(str);

        writeDataToDB(data, requestTime);

    });
}


createTables();
http.request(options, getClanData).end();