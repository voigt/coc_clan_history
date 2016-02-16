var http = require('http');
var koa = require('koa');
var route = require('koa-route');
var app = koa();
var cors = require('kcors');
var sqlite3 = require('sqlite3').verbose();
var dbFile = 'coc.db';
var db = new sqlite3.Database(dbFile);

app.use(cors());

var printMember = function(name){
    var members = [];

    return new Promise(function(resolve, reject) {
//            db.all("SELECT member.id, member.name, member.trophies, member.donations, member.donationsReceived, clan.date\
//                         FROM member LEFT JOIN clan ON member.clan_id = clan.id\
//                        WHERE member.name = (?)", [name], function(err, rows){
//                if (err) return reject(err);
//                //members.push(row);
//                resolve(rows);
//            });

            db.each("SELECT member.id, member.level, member.trophies, member.donations, member.donationsReceived, clan.date\
                             FROM member LEFT JOIN clan ON member.clan_id = clan.id\
                            WHERE member.name = (?)", [name], function(err, row){
                if (err) return reject(err);
                members.push(row);
            }, function() {
                resolve(members);
            });
    });
}

var printMembers = function(){

    var clanNumber = undefined;

    db.get("SELECT * FROM clan ORDER BY clan.id DESC LIMIT 1;", ["KG10"], function(err, row){
        if (err) return err;
        console.log(row.id);
    });

    return new Promise(function(resolve, reject) {
        db.all("SELECT * FROM member WHERE member.clan_id IN\
                (SELECT MAX(member.clan_id) FROM member)\
                ORDER BY member.clan_id ASC;", function(err, rows){

            if (err) return reject(err);

            resolve(rows);
        });

    });
}

app.use(route.get('/', index));
app.use(route.get('/members/', getMembers));
app.use(route.get('/member/:name', getMember));

function *index() {
    this.body = "<h1>Clash of Clans</h1>";
}


function *getMembers(name) {

    var members = yield printMembers();
    this.body = members;

}

function *getMember(name) {

    var members = yield printMember(name);
    this.body = members;

}


app.listen(65431);
console.log('Koa listening on port 65431'hange);
