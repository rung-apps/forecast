import { create } from 'rung-sdk';
import { Location } from 'rung-cli/dist/types';
import Bluebird from 'bluebird';
import agent from 'superagent';
import promisifyAgent from 'superagent-promise';
import {
    tail,
    map,
    join,
    take
} from 'ramda';
import moment from 'moment';

const request = promisifyAgent(agent, Bluebird);
const key = '------YOUR API KEY------';
const url = `https://api.darksky.net/forecast/${key}`;

const styles = {
    container: {
        fontFamily: 'Roboto, sans-serif',
        fontSize: '12px',
        marginTop: '-3px'
    },
    column: {
        display: 'flex'
    },
    icon: {
        width: '35px'
    },
    city: {
        height: '35px',
        lineHeight: '35px',
        fontWeight: 'bold',
        fontSize: '13px',
        width: 'calc(100% - 35px)',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        textTransform: 'capitalize'
    },
    shortDay: {
        fontSize: '10px'
    },
    weather: {
        fontSize: '10px'
    }
};

const condition = {
    'clear-day': '//cdn.apixu.com/weather/64x64/day/113.png',
    'clear-night': '//cdn.apixu.com/weather/64x64/night/113.png',
    'partly-cloudy-day': '//cdn.apixu.com/weather/64x64/day/116.png',
    'partly-cloudy-night': '//cdn.apixu.com/weather/64x64/night/116.png',
    cloudy: '//cdn.apixu.com/weather/64x64/day/119.png',
    rain: '//cdn.apixu.com/weather/64x64/day/296.png',
    sleet: '//cdn.apixu.com/weather/64x64/day/263.png',
    snow: '//cdn.apixu.com/weather/64x64/day/338.png',
    wind: '//i.imgur.com/MzkSz95.png',
    fog: '//cdn.apixu.com/weather/64x64/day/248.png'
};

function createAlert(place, days, unity) {
    return {
        [place]: {
            title: `${_('Weather forecast for')} ${place}`,
            content: renderContent(place, days, unity),
            comment: renderComment(place, days, unity)
        }
    };
}

function renderContent(place, days, unity) {
    const firstDay = days[0];
    const { time, summary, temperatureMax, temperatureMin, icon } = firstDay;
    const dayName = unixTime => moment.unix(unixTime).format('ddd').toUpperCase();

    return (
        <div style={ styles.container }>
            { /* first column */ }
            <div style={ styles.column }>
                <div style={ styles.icon }>
                    <img src={ condition[icon] } height={ 35 } draggable={ false } />
                </div>
                <div style={ styles.city } title={ place }>{ place }</div>
            </div>

            { /* second column */ }
            <div style={ styles.column }>
                <div style={ { width: '50px' } } >
                    <div>▲ { `${Math.round(temperatureMax)} ${unity}` }</div>
                    <div>▼ { `${Math.round(temperatureMin)} ${unity}` }</div>
                </div>
                <div style={ { width: 'calc(100% - 50px)' } }>
                    <div>{ moment.unix(time).format('DD/MM/YYYY') }</div>
                    <div style={ styles.weather }>
                        <b>{ summary }</b>
                    </div>
                </div>
            </div>

            { /* third column */ }
            <div style={ styles.column }>
                { tail(days).map(({ time, icon }) =>
                    <div style={ { width: 'calc(100% / 6)' } }>
                        <div
                            style={ {
                                width: '20px',
                                height: '20px',
                                backgroundImage: `url(${condition[icon]})`,
                                backgroundSize: 'cover'
                            } }
                            draggable={ false }>
                        </div>
                        <div style={ styles.shortDay }>
                            <b>{ _(dayName(time)) }</b>
                        </div>
                    </div>
                ).join('') }
            </div>
        </div>
    );
}

function renderComment(place, days, unity) {
    const imageStyle = 'width: 28px; height: 28px; position: relative; top: 9px;';
    const commentText = (time, summary, temperatureMin, temperatureMax) => {
        const day = moment.unix(time).format('DD/MM/YYYY');
        const min = `${Math.round(temperatureMin)} ${unity}`;
        const max = `${Math.round(temperatureMax)} ${unity}`;
        return `${day}: ${summary}. ${_('Min')}: ${min} | ${_('Max')}: ${max}`;
    };

    return `**${_('Weather forecast for')} ${place}**

        ${join('', map(({ time, summary, temperatureMin, temperatureMax, icon }) => `
            <img
                alt=${JSON.stringify(summary)}
                src=${JSON.stringify(condition[icon])}
                style=${JSON.stringify(imageStyle)}
            /> ${commentText(time, summary, temperatureMin, temperatureMax)}
        `, days))}
    `;
}

function main(context, done) {
    const { place } = context.params;

    return request.get(`https://darksky.net/geo?q=${place}`)
        .then(({ body }) => {
            return request.get(`${url}/${body.latitude},${body.longitude}`)
                .query({
                    exclude: 'currently,minutely,hourly',
                    lang: take(2, context.locale),
                    units: 'auto'
                })
                .then(({ body }) => {
                    const days = take(7, body.daily.data);
                    const { summary } = body.daily;
                    const size = summary.search('°');
                    const unity = summary.slice(size, size + 2);
                    const alert = createAlert(place, days, unity);
                    done({ alerts: alert });
                })
                .catch(() => done({ alerts: {} }));
        })
        .catch(() => done({ alerts: {} }));
}

const params = {
    place: {
        description: _('Which city would you like to follow weather forecasts for?'),
        type: Location,
        required: true
    }
};

// HTML here is static because there are 5k lines of JSON to mock. Impossible
// until we build the Rung file system
const preview = `
<div style="font-family:Roboto, sans-serif;font-size:12px;margin-top:-3px">
   <div style="display:flex">
      <div style="width:35px"><img src="//cdn.apixu.com/weather/64x64/day/176.png" height=35 draggable=false /></div>
      <div style="height:35px;line-height:35px;font-weight:bold;font-size:13px;width:calc(100% - 35px);white-space:nowrap;text-overflow:ellipsis;overflow:hidden" title="Joinville">Joinville</div>
   </div>
   <div style="display:flex">
      <div style="width:64px">
         <div>▲ 21.2 °C</div>
         <div>▼ 18.2 °C</div>
      </div>
      <div style="width:calc(100% - 64px)">
         <div>07/06/2017</div>
         <div style="font-size:10px"><b>Possibilidade de chuva irregular</b></div>
      </div>
   </div>
   <div style="display:flex">
      <div style="width:calc(100% / 6)">
         <div><img src="//cdn.apixu.com/weather/64x64/day/113.png" style="width:100%" draggable=false /></div>
         <div style="font-size:10px"><b>QUI</b></div>
      </div>
      <div style="width:calc(100% / 6)">
         <div><img src="//cdn.apixu.com/weather/64x64/day/119.png" style="width:100%" draggable=false /></div>
         <div style="font-size:10px"><b>SEX</b></div>
      </div>
      <div style="width:calc(100% / 6)">
         <div><img src="//cdn.apixu.com/weather/64x64/day/113.png" style="width:100%" draggable=false /></div>
         <div style="font-size:10px"><b>SÁB</b></div>
      </div>
      <div style="width:calc(100% / 6)">
         <div><img src="//cdn.apixu.com/weather/64x64/day/113.png" style="width:100%" draggable=false /></div>
         <div style="font-size:10px"><b>DOM</b></div>
      </div>
      <div style="width:calc(100% / 6)">
         <div><img src="//cdn.apixu.com/weather/64x64/day/116.png" style="width:100%" draggable=false /></div>
         <div style="font-size:10px"><b>SEG</b></div>
      </div>
      <div style="width:calc(100% / 6)">
         <div><img src="//cdn.apixu.com/weather/64x64/day/113.png" style="width:100%" draggable=false /></div>
         <div style="font-size:10px"><b>TER</b></div>
      </div>
   </div>
</div>
`;

export default create(main, {
    params,
    primaryKey: true,
    title: _('Weather forecast'),
    description: _('Be informed about possible changes in time and do not let them get in the way of your routine!'),
    preview,
    sidebar: {
        priority: false,
        situation: false,
        startDate: false,
        endDate: false
    },
    executionPeriod: '0 0 * * *'
});
