const xml2js = require('xml2js');
const jikan = require('jikan-node');
const axios = require('axios');
const mal = new jikan();
const fs = require('fs');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const inputs = JSON.parse(fs.readFileSync('./inputs.json'));
const main = JSON.parse(fs.readFileSync('./base.json'));

async function fetchList(input){
    switch (input.site) {
        case "myanimelist":
        console.log(input);
        const user = await mal.findUser(input.name).catch(err => console.error(err));
        await sleep(10000);
        for (let i = 0; i < Math.ceil(user.anime_stats.total_entries/300); i++) {
            console.log(i+1);
            const fetch = await mal.findUser(input.name, 'animelist', 'all/'+(i+1)).catch(err => console.error(err));
            console.log(fetch);
            await sleep(10000);
            for (const anime of fetch.anime) {
                if(![1,2,3].includes(anime.watching_status)) continue;
                const match = main.myanimelist.anime.find((element) => {
                    return parseInt(element.series_animedb_id[0], 10) === anime.mal_id;
                });
                if(match){
                    match.my_tags[0] += ', ' + input.name
                    continue;
                }
                main.myanimelist.anime.push({
                    series_animedb_id: [anime.mal_id.toString()],
                    series_title: [anime.title],
                    series_type: [anime.type],
                    series_episodes: [anime.total_episodes.toString()],
                    my_id: ['0'],
                    my_watched_episodes: [anime.total_episodes.toString()],
                    my_start_date: ['0000-00-00'],
                    my_finish_date: ['0000-00-00'],
                    my_rated: [],
                    my_score: ['0'],
                    my_dvd: [],
                    my_storage: [],
                    my_status: ['Completed'],
                    my_comments: [],
                    my_times_watched: ['0'],
                    my_rewatch_value: [],
                    my_tags: [input.name],
                    my_rewatching: ['0'],
                    my_rewatching_ep: ['0'],
                    update_on_import: ['1']
                })
            }
        }
        console.log('done');
        return true;
        break;

        case "anilist":
        console.log(input);
const query = `
query ($username: String, $type: MediaType) {
  MediaListCollection(userName: $username, type: $type) {
    lists {
      entries {
        status
        score(format: POINT_10_DECIMAL)
        media {
          idMal
          title { romaji }
          episodes
          chapters
          volumes
          siteUrl
        }
      }
    }
  }
}
`;
        const fetch = await axios({
            url: 'https://graphql.anilist.co/',
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            data: JSON.stringify({
                query: query,
                variables: {
                    username: input.name,
                    type: 'ANIME'
                }
            })
        }).catch(err => console.error(err));
        await sleep(10000);
        for (let i = 0; i < fetch.data.data.MediaListCollection.lists.length; i++) {
            fetch.data.data.MediaListCollection.lists[i] = fetch.data.data.MediaListCollection.lists[i].entries
        }
        const list = fetch.data.data.MediaListCollection.lists.flat()
        console.log(list);
        for (const anime of list) {
            if(!["WATCHING", "COMPLETED"].includes(anime.status)) continue;
            const match = main.myanimelist.anime.find((element) => {
                return parseInt(element.series_animedb_id[0], 10) === anime.media.idMal;
            });
            if(match){
                match.my_tags[0] += ', ' + input.name;
                continue;
            }
            main.myanimelist.anime.push({
                series_animedb_id: [anime.media.idMal.toString()],
                series_title: [anime.media.title.romaji],
                series_type: [],
                series_episodes: [anime.media.episodes.toString()],
                my_id: ['0'],
                my_watched_episodes: [anime.media.episodes.toString()],
                my_start_date: ['0000-00-00'],
                my_finish_date: ['0000-00-00'],
                my_rated: [],
                my_score: ['0'],
                my_dvd: [],
                my_storage: [],
                my_status: ['Completed'],
                my_comments: [],
                my_times_watched: ['0'],
                my_rewatch_value: [],
                my_tags: [input.name],
                my_rewatching: ['0'],
                my_rewatching_ep: ['0'],
                update_on_import: ['1']
            });
        }
        console.log('done')
        return true;
        break;
    }
}

async function grab () {
    for (const person of inputs) {
        await fetchList(person).catch(err => console.error(err));
    }
    const builder = new xml2js.Builder({cdata: true});
    fs.writeFileSync('./output.xml', builder.buildObject(main));
    console.log(main)
}

async function fuck () {
    for(const file of fs.readdirSync('./inputs')){
        const result = await xml2js.parseStringPromise(fs.readFileSync('./inputs/'+file));
        console.log(result);
        for(const anime of result.myanimelist.anime){
            if(!['Completed', 'Watching', 'On-Hold'].includes(anime.my_status[0])) continue;
            const match = main.myanimelist.anime.find((element) => {
                return element.series_animedb_id[0] === anime.series_animedb_id[0]
            });
            if(match){
                match.my_tags[0] += ', ' + result.myanimelist.myinfo[0].user_name[0]
                //match.my_score.push(anime.my_score[0]);
                continue;
            }
            anime.update_on_import[0] = '1';
            anime.my_status[0] = 'Completed';
            anime.my_score[0] = '0';
            anime.my_start_date[0] = '0000-00-00';
            anime.my_finish_date[0] = '0000-00-00';
            anime.my_watched_episodes = anime.series_episodes;
            anime.my_tags = [result.myanimelist.myinfo[0].user_name[0]]
            main.myanimelist.anime.push(anime);
        }
        console.log('done');
    }
    /*for(const anime of main.myanimelist.anime){
        const scores = anime.my_score.filter((e) => {return e != '0'});
        if(!scores[0]){
            anime.my_score = ['0'];
            continue;
        }
        const score = Math.round(scores.reduce((a, b) => {return parseInt(a, 10) + parseInt(b, 10)})/scores.length);
        console.log(score);
        anime.my_score = [`${score ? score : 0}`];
    }*/
    const builder = new xml2js.Builder({cdata: true});
    fs.writeFileSync('./output.xml', builder.buildObject(main));
}

grab()

setInterval(() => {return;}, 1000)