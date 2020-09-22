var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 4000;

var Twitter = require('twitter-lite');

var client = new Twitter({
    
});

// TODO: カプセル化
// TODO: 前のstreamを安全に破壊 
// TODO: 同じ検索文字列だった場合、streamを新しく作らないようにしたい。
// var stream;
// var query = { track: '' };
// var trend_list = [];
var trend = '';

const setStream = (trend) => {
    console.log('setting stream');
    const query = { track: trend };
    return new Promise((resolve) => {
        const stream = client.stream('statuses/filter', query)
            .on('data', (data) => {
                const { id_str, text, created_at, extended_entities, user, retweeted_status } = data;
                if (!retweeted_status && id_str) {
                    console.log('tweeted', id_str);
                    let media_url = [];
                    let media_short_url = [];
                    // media_urlを作成
                    if (extended_entities && 'media' in extended_entities) {
                        const media = extended_entities.media;
                        for (const item of media) {
                            media_url.push(item.media_url_https);
                            media_short_url.push(item.url);
                        }
                    }
                    let text_data = '';
                    if (text) {
                        text_data = text.replace(media_short_url.join(' '), '');
                    }
                    const displayedData = {
                        id: id_str,
                        text: text_data,
                        date: new Date(created_at),
                        media_url: media_url,
                        usr: { id: user.screen_name, name: user.name }
                    };
                    io.emit('quack-get-tweet', displayedData);
                }
            })
            .on('error', (error) => {
                console.log(error);
                throw error;
            })
            .on('start', () => {
                console.log('start streaming');
            })
            .on('end', () => {
                console.log('end streaming');
            });
        resolve(stream);
    });
}


const getTrendList = (query) => {
    console.log('getting TrendList');
    return new Promise((resolve) => {
        client.get('trends/place', query)
            .then(results => {
                if (results.length > 0) {
                    trend_list = results[0].trends;
                    resolve(results[0].trends);
                }
            })
            .catch(console.error);
    });
};

const setTrend = (trends, index = 0) => {
    console.log('setting Trend', trends[0].name);
    return new Promise(resolve => {
        trend = trends[index].name;
        io.emit('quack-get-trend', { name: trend });
        resolve(trend);
    });
};

// TODO トレンド取得方法
const method = () => getTrendList({ id: 23424856 })
    .then(t_list => setTrend(t_list, 0))
    .then(t => setStream(t))
    .catch(() => {
        clearInterval(interval);
        console.error('error');
    });
method();
const interval = setInterval(method, 600000);

// Connection
io.on('connection', (socket) => {
    // 接続した人にだけtrend情報を渡す
    io.to(socket.id).emit('quack-get-trend', { name: trend });
});
http.listen(port, () => {
    console.log('listening on *:' + port);
});
