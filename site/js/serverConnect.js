//Инициализируем переменную,
// она должна автоматически подключится к серверу
// если этого не происходит, нам надо явно указать урл сервера\
// http://localhost:3000/ - http://localhost:3000/socket.io
// http://localhost:3000/ - http://localhost:3001/
let socket = io();
//Отслеживаем событие, когда сервер стучится к нам по событию - statistic
socket.on("statistic",(data)=>{
    //Просто берем и ставим html код в таблицу
    $("div#averages table tbody").html(
        `
                <td>${data.currentDayAverages.tempPerHour} °С</td>
                <td>${data.currentDayAverages.humidPerHour} г/м³</td>
                <td>${data.currentDayAverages.tempPerDay} °С</td>
                <td>${data.currentDayAverages.humidPerDay} г/м³</td>
        `
    )
    //Просто берем и ставим html код в таблицу
    $("div#last table tbody").html(
        `
                <td>${data.lastStatistic.date}</td>
                <td>${data.lastStatistic.temp} °С</td>
                <td>${data.lastStatistic.humid} г/м³</td>
                <td>${data.lastStatistic.info} г/м³</td>
        `
    )
    //Проверяем на сервере лампочка вкл или нет ?
    if(data.button === "off"){
        //Нет, ну значит удаляем класс у индикатора
        $('#led-active').removeClass("on")
        //И ставим в инпут значение
        $("#led").val("Led: Off")
    }else{
        //И наоборот
        $('#led-active').addClass("on")
        $("#led").val("Led: On")
    }
})
//Проверяем если страница загрузилась
$(document).ready(()=>{
    //то ставим обработчик на нажатие нашей кнопки
    $("#led").on("click",(e)=>{
        //Когда кнопка нажата, мы отправляем на сервер событие led, сервер должен выключить или включить лампочку
        socket.emit("led");
    })
    //Кнопка для очистки поиска
    $("#clear_search_b").on("click",(e)=>{
        //Прячем и включаем таблицы
        $("#search").val("")
        $("#averages").show();
        $("#last").show();
        $("#sort table tbody").html("")
        $("#sort").hide();
    })
    $("#search_b").on("click",(e)=>{
        //Получаем данные из инпута даты
        let date = $("#search").val()
        if(!date)
            return;
        //Когда кнопка нажата, мы отправляем на сервер событие search,
        // сервер должен найти то что нужно и отправить нам ответ
        // вторым аргументом мы отправляем нашу дату
        // а третим мы отправляем callback функцию,
        // сервер после того как найдет то что нужно,
        // даст ответ и мы сразу получим ответ в переменную data
        socket.emit("search",date,(data)=>{
            //Ответ от сервера получен
            $("#averages").hide();
            $("#last").hide();
            $("#sort").show();
            let html = "";
            //перебираем полученный результат и пишем в переменную
            data.map(x=>{
                html+= `  <td>${x.time_create}</td>
                <td>${x.temp} °С</td>
                <td>${x.humid} г/м³</td>
                <td>${x.info}</td>`
            })
            //записываем html
            $("#sort table tbody").html(html)
        });
    })

})