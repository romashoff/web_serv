/*
Входной файл, его мы и запускаем на сервере=
 */
//Ищем дату начала дня
let start = new Date();
start.setUTCHours(0, 0, 0, 0);
//Ищем дату конца дня
let end = new Date();
end.setUTCHours(23, 59, 59, 999);
start = start.toISOString().replace("T", " ").replace(".000Z", "");
end = end.toISOString().replace("T", " ").replace(".999Z", "");
//Тут будем хранить все записи за день
let currentDayStatics = [];
//Тут будем хранить статистику записей за день
let currentDayAverages = {
    tempPerHour: 0,
    humidPerHour: 0,
    tempPerDay: 0,
    humidPerDay: 0,
};
let lastStatistic = {
    date: null,
    temp: "",
    humid: "",
    info: "",
}

//Ну индикатор выключим
let button = "off";
//Подключаем библиотеку для корректной работы express с полученными данными из вне
const bodyParser = require('body-parser');
//Подключаем библиотеку express, это наш сервер
const express = require('express');
//Подключаем библиотеку для работы с базой
const mysql = require('mysql');
//Ну и подключаемся к серверу
const con = mysql.createConnection({
    host: "rsroma3n.beget.tech",
    user: "rsroma3n_romrom",
    password: "JaYXbX&6",
    database: "rsroma3n_romrom"
});

//Делаем первую подгрузку данных
function initList() {

    function a(err, result, fields) {
        if (err) throw err;
        //тут перебираем полученный результат и пушим в нашу переменную
        if (result.length) {
            result.map(x => {
                currentDayStatics.push({...x})
            })
            //Запоминаем ласт инфу
            lastInfo()
            //Вызываем функцию для подсчета средней статы
            dayAverages()
        }
    }

    //Ищем все записи за сегодня и вызываем функцию a
    getFiltered(start, end, a)

}



//Подключаем библиотеку socket.io - это вебсокеты
const {Server} = require("socket.io");
//Инициализируем
const app = express();
//Тут мы указываем где лежат
// наши статические файлы
// к примеру скрипты js,css или картинки
//Теперь когдаа фронт будет искать статик файлы
//Сервер будет понимать откуда их тянуть
app.use(express.static(__dirname + '/site'))
//А тут мы говорим экспресу, чтобы умел читать json данные в формате x-www-form-urlencoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


//Тоже штука для сервера
const http = require('http');
//Создаем сервер под началом express
const server = http.createServer(app);
//Указываем нашему io, на каком сервере принимать запросы
//и инициализируем сами сокеты
//!!! НЕ ЗАБЫВАЕМ ИНИЦИАЛИЗИРОВАТЬ СОКЕТЫ НА ФРОНТЕ В HTML ФАЙЛЕ
const io = new Server(server);


//Таким образом мы задаем, что если на сервер обращаются
//по корневому каталогу, то мы ему выводим сайт
app.get('/', (req, res) => {
    //Теперь передаем ему наш файл html, при запуске сайта по урлу / выдаваться будет html
    res.sendFile(__dirname + '/site/index.html');
});
//Это событие обрабатываем POST запросы от ардуино
//специально сохранил урл, чтобы не пришлось менять
//тут мы будем получать данные и писать в базу
app.post('/enc_write.php', (req, res) => {
    let body = req.body;//Тут мы получаем тело запроса
    insertStatic(parseInt(body.temp), parseInt(body.humid), body.info)
    res.send(`<${button}>`);
});

//Это обработка событий, при правильном подключении
// пользователя к сокетам, будет вызываться это событие
io.on('connection', (socket) => {
    socket.emit("statistic", {lastStatistic, currentDayAverages, button});
    /*теперь у нас есть определенный сокет.
    * работает только с ним
    * все события теперь назначаем на сокет
    */
    //К примеру - сокет = человек,
    //Это событие обрабатывает -
    // Если этот человек отключился,
    // мы выполняем определенные действия

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    //Это наше созданное событие, мы его отправляем с клиента,
    // когдаа нажимаем на кнопку led лампы
    socket.on("led",()=>{
        //Проверяем выключена лампочкаа или нет
        button = button === "off" ? "on" : "off";
    })
    //Если клиент нам прислал событие на поиск
    //Вторым аргументом мы какк рз принимаем
    //колбек функцию, которую надо вызвать когда
    //найдет ответ
    socket.on("search",(data,fn)=>{
        getSearch(data,(err, result, fields)=> {
            if (err) throw err;
            fn(result)
        })
    })
    console.log('a user connected');
});
//Ставим интервал на 500мс, будем отправлять всем клиентам данные
setInterval(() => {
    io.emit("statistic", {lastStatistic, currentDayAverages, button});
}, 500)

//Говорим чтобы сервер слушал 3000 порт.
// Сервер запуститься на машине под урлом http://localhost:3000
server.listen(3000, () => {
    console.log('listening on *:3000');
});


//Функция которая будет искать все наши записи по введеной дате
const getSearch = (date, cb) => {
    date = date.replace("T"," ");
    //ну тут думаю не надо объяснять
    con.connect(function (err) {
        con.query(`SELECT *
                   FROM history
                   WHERE time_create LIKE  '%${date}%'
                   ORDER BY time_create DESC`,
            cb);

    })
}
//Функция которая будет искать все наши записи по фильтру
const getFiltered = (min_date, max_date, cb) => {
    //ну тут думаю не надо объяснять
    con.connect(function (err) {

        con.query(`SELECT *
                   FROM history
                   WHERE (time_create BETWEEN '${min_date}' AND '${max_date}')
                   ORDER BY time_create DESC`,
            cb);

    })
}
//Записываем статистику
const insertStatic = (temp, humid, info) => {
    let time_create = new Date();
    time_create = time_create.toISOString().replace("T", " ").replace("Z", "");

    //Вместо того чтобы дергать базу, я просто сразу запишу новые данные в наш массив
    currentDayStatics = prepend({
        temp, humid, info, time_create
    }, currentDayStatics)
    //Запоминаем ласт инфу
    lastInfo()
    //Вызываем функцию для подсчета средней статы
    dayAverages()
    //Вместо того чтобы дергать базу, я просто сразу запишу новые данные в наш массив
    con.connect(function (err) {
        con.query(`INSERT INTO history (temp, humid, info, time_create)
                   VALUES (${temp}, ${humid}, "${info}", CURRENT_TIMESTAMP)`,
            function (err, result) {
                if (err) throw err;
                console.log("Result: " + result);

            });
    })
}
//Тут будем подсчитывать и запоминать среднюю стату за день и час
const dayAverages = () => {
    //Проверяем есть ли у нас вообще записи
    if (!currentDayStatics.length) {
        currentDayAverages = {
            tempPerHour: "Н/Д",
            humidPerHour: "Н/Д",
            tempPerDay: "Н/Д",
            humidPerDay: "Н/Д",
        }
    } else {
        //если есть, сразу проверяем. у нас вообще есть час ?
        if (currentDayStatics.length < 720) {
            currentDayAverages.tempPerHour = "Н/Д";
            currentDayAverages.humidPerHour = "Н/Д";
        } else {
            //Берем 720 записей
            const slicedArray = currentDayStatics.slice(0, 720);
            //Теперь функцией reduce считаем сумму темпы/влажности, и делим на 720, среднее значение
            let avTemp = ((slicedArray.reduce((partialSum, a) => partialSum + a.temp, 0)) / 720).toFixed(2)
            let avHumid = ((slicedArray.reduce((partialSum, a) => partialSum + a.humid, 0)) / 720).toFixed(2)
            //записываем
            currentDayAverages.tempPerHour = avTemp;
            currentDayAverages.humidPerHour = avHumid;
        }
        //Нет смысла проверять прошел ли день я думаю,
        // поэтому возьмем все значения, что есть и будем использовать

        //Теперь функцией reduce считаем сумму темпы/влажности, и делим на 720, среднее значение
        let avTemp = ((currentDayStatics.reduce((partialSum, a) => partialSum + a.temp, 0)) / currentDayStatics.length).toFixed(2)
        let avHumid = ((currentDayStatics.reduce((partialSum, a) => partialSum + a.humid, 0)) / currentDayStatics.length).toFixed(2)
        //записываем
        currentDayAverages.tempPerDay = avTemp;
        currentDayAverages.humidPerDay = avHumid;
    }
}
//Тут будем подсчитывать и запоминть последние полученные данные
const lastInfo = () => {
    //Проверяем есть ли у нас вообще записи
    if (!currentDayStatics.length) {
        lastStatistic = {
            date: "Н/Д",
            temp: "Н/Д",
            humid: "Н/Д",
            info: "Н/Д",
        }
    } else {
        //Если есть, то записываем последнее значение
        lastStatistic = {
            date: currentDayStatics[0].time_create,
            temp: currentDayStatics[0].temp,
            humid: currentDayStatics[0].humid,
            info: currentDayStatics[0].info,
        }
    }
}

//Эта функция позволит нам засовывать в массив элемент на 0 позицию
function prepend(value, array) {
    var newArray = array.slice();
    newArray.unshift(value);
    return newArray;
}

initList();