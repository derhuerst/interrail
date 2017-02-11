'use strict'

const moment = require('moment-timezone')
const bit = require('bit-encode')
const parseDuration = require('parse-iso-duration')
const h = require('./helpers')

const formatId = (id) => '00'+((id+'').slice(-7))

const modeCaptions = []
modeCaptions[1] = 'high speed train'
modeCaptions[2] = 'long-distance train'
modeCaptions[3] = 'long-distance night train'
modeCaptions[4] = 'regional train'

const modeTypes = []
modeTypes[1] = 'highSpeed'
modeTypes[2] = 'long-distance'
modeTypes[3] = 'long-distance-night'
modeTypes[4] = 'regional'

const parseLeg = (leg) => {
	const res = {}
	// from
	res.from = {
			name: leg.Origin.name,
			id: +leg.Origin.extId
	}
	if(leg.Origin.lon && leg.Origin.lat){
		res.from.latitude = +leg.Origin.lat
		res.from.longitude = +leg.Origin.lon
	}
	// to
	res.to = {
			name: leg.Destination.name,
			id: +leg.Destination.extId
	}
	if(leg.Destination.lon && leg.Destination.lat){
		res.to.latitude = +leg.Destination.lat
		res.to.longitude = +leg.Destination.lon
	}
	res.departure = moment.tz(leg.Origin.date + 'T' + leg.Origin.time, 'Europe/Berlin').format()
	res.arrival = moment.tz(leg.Destination.date + 'T' + leg.Destination.time, 'Europe/Berlin').format()

	res.product = {
		line: leg.Product.name,
		nr: +leg.Product.num,
		type: modeTypes[+leg.Product.catCode] || null,
		caption: modeCaptions[+leg.Product.catCode] || null,
		operator: leg.Product.operator
	}

	res.line = leg.name
	if(leg.Product){
		res.operator = leg.Product.operator
	}

	return res
}

const parseServiceDays = (serviceDays) => {
	const raw = Buffer.from(serviceDays.sDaysB, 'hex')
	const days = []
	for (let i = 0; i < 365; i++) days.push(!!bit.get(raw, i))
	return {
		from: serviceDays.planningPeriodBegin,
		to: serviceDays.planningPeriodEnd,
		days
	}
}

const parseRoute = (route) => ({
	parts: route.LegList.Leg.map(parseLeg),
	schedules: route.ServiceDays.map(parseServiceDays),
	duration: parseDuration(route.duration)
})

const routes = (from, to, date) => {
	if(!from || !to) return []
	date = moment(date || null).tz('Europe/Berlin')

	return h.request('https://timetable.eurail.com/v1/timetable/trip', {
		lang: 'en',
		originId: formatId(from),
		destId: formatId(to),
		date: date.format('YYYY-MM-DD'),
		time: date.format('HH:mm')
	})
	.then((res) => res.Trip || [])
	.then((res) => res.map(parseRoute))
}

module.exports = routes
