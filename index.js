var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 4000;

var Twitter = require('twitter-lite');

var client = new Twitter({
 
});

const setStream = (trend) => {
    console.log('setting stream');
    const query ={track: trend};
    return new Promise((resolve)=>{
        const stream = client.stream('statuses/filter', query)
            .on('data', (data) => {
            const {id_str, text,created_at, extended_entities, user, retweeted_status} = data;
            if(!retweeted_status && id_str){
                console.log('tweeted', id_str);
                let media_url = [];
                let media_short_url = [];
                // media_urlを作成
                if(extended_entities && 'media' in extended_entities){
                    const media = extended_entities.media;
                    for (const item of media) {
                        media_url.push(item.media_url_https);
                        media_short_url.push(item.url);
                    }
                }
    
                // text
                let text_data = ''; 
                if(text){
                    text_data = text.replace(media_short_url.join(' '),'');
                }
        
                const displayedData = {
                    id: id_str,
                    text: text_data,
                    date: new Date(created_at),
                    media_url: media_url,
                    usr: {id: user.screen_name, name: user.name}
                };
                io.emit('tweet', displayedData);
            }})
            .on('error', (error) => {
                throw error;
            })
            .on('start', () => {
                console.log('start streaming');
            })
            .on('end', () =>{
                console.log('end streaming');
            });
        resolve(stream);
    });
}

var trend_list = []; // TODO カプセル化
const getTrendList = (query) => {
    console.log('getting TrendList');
    return new Promise((resolve)=>{
        client.get('trends/place',query)
        .then(results => {
            if(results.length > 0){ 
                trend_list = results[0].trends;
                resolve(results[0].trends);
            }
        })
        .catch(console.error);
    });
};

const setTrend = (trends, index = 0) =>{
    console.log('setting Trend');
    return new Promise(resolve =>{
        io.emit('title', trends[index].name);
        resolve(trends[index].name);
    });
};

// TODO トレンド取得方法
// 一定時間後に繰り返しトレンドを取るようにしたい
getTrendList({id : 23424856})
.then(t_list => setTrend(t_list,0))
.then(t => setStream(t))
.then(s =>{})
.catch(console.error);



// Connection
io.on('connection', (socket)=>{
    console.log('connection');
    // ブロードキャストでクライアントに送りつけたい
    setTrend(trend_list, 0).then(t => io.emit('title', t));
});
http.listen(port, ()=>{
    console.log('listening on *:' + port);
});

// let id_max = '0';
// const interval = setInterval(() => {
//     if(id_max !== '0') id_max = id_max.slice(0,5)+(Number(id_max.slice(5))+1);
//     client.get('search/tweets',
//     {
//         count: 10 ,
//         q: 'スプラ', 
//         result_type: 'recent'
//     })
//     .then(result => 
//     {
//         result.statuses.forEach(data =>{
//             const {id_str, text,created_at, extended_entities, user, retweeted_status} = data;
//             if(!retweeted_status){
//                 //if(Number(id_max.slice(-10)) < Number(id_str.slice(-10))){
//                 id_max = id_str;
//                 console.log('tweeted', id_max);
            
//                 let media_url = [];
//                 let media_short_url = [];
//                 // media_urlを作成
//                 if(extended_entities && 'media' in extended_entities){
//                     const media = extended_entities.media;
//                     for (const item of media) {
//                         media_url.push(item.media_url_https);
//                         media_short_url.push(item.url);
//                     }
//                 }
        
//                 const displayedData = {
//                     id: id_str,
//                     text: text.replace(media_short_url.join(' '),''),
//                     date: new Date(created_at),
//                     media_url: media_url,
//                     usr: {id: user.screen_name, name: user.name}
//                 };
//                 io.emit('tweet', displayedData);
//                 }
//             }
//        // });
//        );
//     })
//     .catch(console.error);
// }, 5000);