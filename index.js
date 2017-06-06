import { create } from 'rung-sdk';
import { String as Text, OneOf } from 'rung-sdk/dist/types';
import Bluebird from 'bluebird';
import agent from 'superagent';
import promisifyAgent from 'superagent-promise';
import { always, cond, equals, tail, map, join } from 'ramda';
import moment from 'moment';

const request = promisifyAgent(agent, Bluebird);
const key = '1c1d38d2629e4505b0c145613171505';
const url = `https://api.apixu.com/v1/forecast.json?key=${key}`;

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
        overflow: 'hidden'
    },
    shortDay: {
        fontSize: '10px'
    },
    weather: {
        fontSize: '10px'
    }
};

const dayName = cond([
    [equals(0), always(_('SUN'))],
    [equals(1), always(_('MON'))],
    [equals(2), always(_('TUE'))],
    [equals(3), always(_('WED'))],
    [equals(4), always(_('THU'))],
    [equals(5), always(_('FRI'))],
    [equals(6), always(_('SAT'))]
]);

function createAlert(name, region, days) {
    return {
        [name + region]: {
            title: `${_('Weather forecast for')} ${name}, ${region}`,
            content: renderContent(name, days),
            comment: renderComment(name, region, days)
        }
    };
}

function renderContent(name, days) {
    const [firstDay] = days;
    const { condition, maxtemp_c, mintemp_c } = firstDay.day;

    return (
        <div style={ styles.container }>
            { /* first column */ }
            <div style={ styles.column }>
                <div style={ styles.icon }>
                    <img src={ condition.icon } height={ 35 } draggable={ false } />
                </div>
                <div style={ styles.city } title={ name }>{ name }</div>
            </div>

            { /* second column */ }
            <div style={ styles.column }>
                <div style={ { width: '64px' } } >
                    <div>▲ { maxtemp_c } °C</div>
                    <div>▼ { mintemp_c } °C</div>
                </div>
                <div style={ { width: 'calc(100% - 64px)' } }>
                    <div>{ moment(firstDay.date).format('DD/MM/YYYY') }</div>
                    <div style={ styles.weather }><b>{ condition.text }</b></div>
                </div>
            </div>

            { /* third column */ }
            <div style={ styles.column }>
                { tail(days).map(({ day, date }) =>
                    <div style={ { width: 'calc(100% / 6)' } }>
                        <div>
                            <img src={ day.condition.icon } style={ { width: '100%' } } draggable={ false } />
                        </div>
                        <div style={ styles.shortDay }><b>{ dayName(moment(date).day()) }</b></div>
                    </div>
                ).join('') }
            </div>
        </div>
    );
}

function renderComment(name, region, days) {
    const imageStyle = 'width: 28px; height: 28px; position: relative; top: 9px;';

    return `**${_('Weather forecast for')} ${name}, ${region}**

        ${join('', map(({ day, date }) => `
            <img
                alt=${JSON.stringify(day.condition.text)}
                src=${JSON.stringify(day.condition.icon)}
                style=${JSON.stringify(imageStyle)}
            /> ${moment(date).format('DD/MM/YYYY')}: ${day.condition.text}. ${_('Min')}: ${day.mintemp_c} °C | ${_('Max')}: ${day.maxtemp_c} °C
        `, days))}
    `;
}

function main(context, done) {
    const { place: q, language } = context.params;
    const lang = language === 'en' ? '' : language;

    return request.get(url)
        .query({ q, days: 7, lang })
        .then(({ body }) => {
            const { location, forecast } = body;
            const { name, region } = location;
            const { forecastday: days } = forecast;

            const alert = createAlert(name, region, days);
            done({ alerts: alert });
        })
        .catch(() => done({ alerts: {} }));
}

const languages = [
    'ar', 'bn', 'bg', 'zh', 'zh_tw', 'cs', 'da', 'nl', 'en', 'fi',
    'fr', 'de', 'el', 'hi', 'hu', 'it', 'ja', 'jv', 'ko', 'zh_cmn',
    'mr', 'pl', 'pt', 'pa', 'ro', 'ru', 'sr', 'si', 'sk', 'es',
    'sv', 'ta', 'te', 'tr', 'uk', 'ur', 'vi', 'zh_wuu', 'zh_hsn',
    'zh_yue', 'zu'
];

/* LANGUAGES WITH LABELS
const languages = {
    'Arabic': 'ar', 'Bengali': 'bn', 'Bulgarian': 'bg', 'Chinese Simplified': 'zh',
    'Chinese Traditional': 'zh_tw', 'Czech': 'cs', 'Danish': 'da', 'Dutch': 'nl',
    'English': 'en', 'Finnish': 'fi', 'French': 'fr', 'German': 'de', 'Greek': 'el',
    'Hindi': 'hi', 'Hungarian': 'hu', 'Italian': 'it', 'Japanese': 'ja', 'Javanese': 'jv',
    'Korean': 'ko', 'Mandarin': 'zh_cmn', 'Marathi': 'mr', 'Polish': 'pl',
    'Portuguese': 'pt', 'Punjabi': 'pa', 'Romanian': 'ro', 'Russian': 'ru',
    'Serbian': 'sr', 'Sinhalese': 'si', 'Slovak': 'sk', 'Spanish': 'es', 'Swedish': 'sv',
    'Tamil': 'ta', 'Telugu': 'te', 'Turkish': 'tr', 'Ukrainian': 'uk', 'Urdu': 'ur',
    'Vietnamese': 'vi', 'Wu (Shanghainese)': 'zh_wuu', 'Xiang': 'zh_hsn',
    'Yue (Cantonese)': 'zh_yue', 'Zulu': 'zu'
};
 */

const params = {
    place: {
        description: _('Which city would you like to follow weather forecasts for?'),
        type: Text,
        required: true
    },
    language: {
        description: _('Language'),
        type: OneOf(languages),
        default: 'pt'
    }
};

export default create(main, { params, primaryKey: true });
