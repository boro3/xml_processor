const http = require('http');
const https = require('https');
const he = require('he')
var parser = require('fast-xml-parser');
const list = require('./list');

const makerequest = (url, onResult) => {
    let output = '';
    let protocol = url.substring(0, 5) == 'https' ? https : http
    const req = protocol.get(url, (res) => {
        if (res.statusCode == 200) {
            res.setEncoding('utf8');

            res.on('data', (chunk) => {
                output += chunk;
            });

            res.on('end', () => {
                let obj = output;
                onResult(obj);
            });
        } else {
            console.log('Feed Error!')
        }
    });

    req.on('error', (err) => {
        console.log('error: ' + err.message);
    });

    req.end();
};
var options = {
    attributeNamePrefix: "@",
    attrNodeName: "attr",
    textNodeName: "#text",
    ignoreAttributes: false,
    parseAttributeValue: true,
    trimValues: true,
    attrValueProcessor: (val, attrName) => he.decode(val, { isAttributeValue: true }),
    tagValueProcessor: (val, tagName) => he.decode(val)
};

const processXmlData = async (xmlFeed) => {

    var tObj = parser.getTraversalObj(xmlFeed, options);
    var jsonObj = (parser.convertToJson(tObj, options));

    let podcast = {};
    podcast.title = jsonObj.rss.channel.title;
    // check and set author
    if (jsonObj.rss.channel.author) {
        podcast.author = jsonObj.rss.channel.author;
    } else if (jsonObj.rss.channel['itunes:author']) {
        podcast.author = jsonObj.rss.channel['itunes:author'];
    }
    // description
    if (!(jsonObj.rss.channel.description === '') && jsonObj.rss.channel.description)
    podcast.description = jsonObj.rss.channel.description;
    // podcast link
    if (jsonObj.rss.channel.link)
    podcast.link = jsonObj.rss.channel.link;
    // podcast image
    if (jsonObj.rss.channel['itunes:image']) {
        podcast.image = jsonObj.rss.channel['itunes:image'].attr['@href'];
    } else if (jsonObj.rss.channel.image.url) {
        podcast.image = jsonObj.rss.channel.image.url;
    }
    //episodes
    let episodes = [];
    let episode = {};
    if (Array.isArray(jsonObj.rss.channel.item)) {
        jsonObj.rss.channel.item.forEach(ep => {
            episode.title = ep.title;
            if (ep.description) {
                episode.description = ep.description;
            }
            if (ep.pubDate) {
                episode.pubDate = ep.pubDate;
            }
            if (ep.guid) {
                episode.guid = ep.guid['#text'] !== undefined ? ep.guid['#text'] : ep.guid;
            }
            if (ep.link) {
                episode.link = ep.link;
            }
            episode.url = ep.enclosure.attr['@url'];
            episodes.push(episode);
            episode = {};
        });
    } else {
        episode.title = jsonObj.rss.channel.item.title;
        if (jsonObj.rss.channel.item.description) {
            episode.description = jsonObj.rss.channel.item.description;
        }
        if (jsonObj.rss.channel.item.pubDate) {
            episode.pubDate = jsonObj.rss.channel.item.pubDate;
        }
        if (jsonObj.rss.channel.item.guid) {
            episode.guid = jsonObj.rss.channel.item.guid['#text'] !== undefined ? jsonObj.rss.channel.item.guid['#text'] : jsonObj.rss.channel.item.guid;
        }
        if (jsonObj.rss.channel.item.link) {
            episode.link = jsonObj.rss.channel.item.link;
        }
        episode.url = jsonObj.rss.channel.item.enclosure.attr['@url'];
        episodes.push(episode);
        episode = {};
    }
    podcast.episodes = episodes;
    console.log(podcast)
};

list.list.forEach(item=>{
    makerequest(item,processXmlData);
})
