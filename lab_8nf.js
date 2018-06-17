//Лаба8: получить с двух сайтов а через api инфу о мероприятиях в крупном городе 
// для заданого диапазона дат. Произвести фильтрацию по ключевым словам. 
// Избавиться от дубликатов.  

'use strict';
var request = require('sync-request'); //подключаем библиотеку для запросов
var fs = require('fs');                //для работы с файлами
var express = require('express'); 
var app = express();                 //создать объект приложения

// глобальные переменные meetup и eventbrite
var meetup = {
	url: 'https://api.meetup.com/find/upcoming_events',
	method: 'GET',
	name: 'meetup',
	qs: {
		key: '4b406468277a1636524e2f481bc6855',
		text: 'data',
		start_date_range: '2018-06-10T00:00:00',
		end_date_range: '2018-06-20T00:00:00',
		radius: '5',
		lon: '-122.42',
		lat: '37.78',
		page: '1000'
	}
};
var eventbrite = {
	url: 'https://www.eventbriteapi.com/v3/events/search',
	method: 'GET',
	name: 'eventbrite',
	qs: {
		token: 'DQ2EYSOBZCV6BRDZHYVH',
		q: 'data',
		'start_date.range_start': '2018-06-10T00:00:00',
		'start_date.range_end': '2018-06-20T00:00:00',
		'location.within': '5km',
		'location.longitude': '-122.42',
		'location.latitude': '37.78',
		page: 1
	}
};

// загрузить события из гл перем
function getJSON(data) {
	var req = request(data.method, data.url, data);
	var result = JSON.parse(req.getBody('utf8'));
	console.log('Загружено: ' + result.events.length + ' событий, ' + data.name);
	return result.events;
}

var json_meetup = getJSON(meetup);
var json_eventbrite = getJSON(eventbrite);
// записать, чтобы посмотреть структуру
// fs.writeFileSync('meetup.json', JSON.stringify(json_meetup, '', 4));
// fs.writeFileSync('eventbrite.json', JSON.stringify(json_eventbrite, '', 4));

// var json_meetup = JSON.parse(fs.readFileSync('meetup.json', 'utf8'));
// var json_eventbrite = JSON.parse(fs.readFileSync('eventbrite.json', 'utf8'));

// удалить дубликаты в eventbrite
function delete_duplicate(json_meetup, json_eventbrite) {
	var count = 0; //счетчик
	for (var i = 0; i < json_meetup.length; i++) {
		for (var j = 0; j < json_eventbrite.length; j++) {
			if ( json_meetup[i].name == json_eventbrite[j].name.text ) {
				json_eventbrite.splice(j, 1);
				count++;
			}
		}
	}
	console.log('Удалено дубликатов: ' + count);
}
delete_duplicate(json_meetup, json_eventbrite);

// построить массив из items - инфа про каждое событие
function all(json_meetup, json_eventbrite) {
	var merged_array = [];

	for (var i = 0; i < json_meetup.length; i++) {
		if (json_meetup[i].local_date && json_meetup[i].local_time) { 
			var item = {
				'name': json_meetup[i].name,
				'date_time': json_meetup[i].local_date + 'T' + json_meetup[i].local_time + ':00',
				'description': json_meetup[i].description,
				'link': json_meetup[i].link
			}
			merged_array = merged_array.concat(item);
		} 
	}

	for (var i = 0; i < json_eventbrite.length; i++) { 
		if (json_eventbrite[i].start.local) { 
			var item = {
				'name': json_eventbrite[i].name.text,
				'date_time': json_eventbrite[i].start.local,
				'description': json_eventbrite[i].description.html,
				'link': json_eventbrite[i].url
			}
			merged_array = merged_array.concat(item);
		} 
	}

	return merged_array;
}
var merged_array = all(json_meetup, json_eventbrite);

//сортировка по времени проведения
merged_array.sort(function(event1, event2) {
	return Date.parse(event1.date_time) - Date.parse(event2.date_time);
});

// создание html 
function html() {
	for (var i = 0; i < merged_array.length; i++) {
		merged_array[i].date = new Date(Date.parse(merged_array[i].date_time)).toLocaleString("en-US", {year: 'numeric', month: 'long', day: 'numeric'});
	}
	var currentDate = merged_array[0].date;

	//создается файл out.html 
	fs.writeFileSync('out.html', 
		'<!DOCTYPE html>' + 
		'<html lang="en">' + 
		'<head><meta charset="UTF-8"><title>Meetups</title>' +
		'<link rel="stylesheet" href="/public/css/main.css">' + 
		'</head>' + 
		'<body>' +
		'<div class="wrap"><h1>Все встречи в Сан Франциско</h1><h2 class="date">' + currentDate + '</h2>');

	for (var i = 0; i < merged_array.length; i++) {
		//если дата i-го элемента массива совпадает с текущей датой, событие выводится в html
		if (merged_array[i].date == currentDate) {
			fs.appendFileSync('out.html',
				'<h3 class="title"><a href=' + merged_array[i].link + ' target=blank>' + merged_array[i].name + '</a></h2><br>' + 
				'<div class="date_time"><strong>Date: </strong> ' + merged_array[i].date_time + '</div><br>' +
				'<div class="desc"><strong>Description:</strong> ' + merged_array[i].description + '</div><br><br>'
			)
		} else { 
			currentDate = merged_array[i].date;
			fs.appendFileSync('out.html', '<h2 class="date">' + currentDate + '</h2>');
		}
		
	}
	fs.appendFileSync('out.html', '</body></html>');
	console.log('html файл создан. Добавлено событий: ' + merged_array.length);
}
html();

//папка для всякого
app.use('/papka', express.static('papka'));

//главная страница 
app.get('/', function(req, res) {
	res.sendFile(__dirname + "/out.html");
});

//http://127.0.0.1:3000
app.listen(3000); 
console.log('Локальный сервер запущен: http://127.0.0.1:3000/');
