import { create } from 'rung-sdk';
import { String as Text, OneOf } from 'rung-sdk/dist/types';
import Bluebird from 'bluebird';
import agent from 'superagent';
import promisifyAgent from 'superagent-promise';
import { map, mergeAll } from 'ramda';
import moment from 'moment';

const request = promisifyAgent(agent, Bluebird);
const key = '<<<<< YOUR KEY HERE >>>>>>';
const url = `https://api.apixu.com/v1/forecast.json?key=${key}`;

const styles = {
    container: {
        fontFamily: 'Roboto, sans-serif',
        textAlign: 'center',
        fontSize: '12px'
    },
    noMargin: {
        margin: '0px'
    },
    noMarginBottom: {
        marginBottom: '0px'
    }
};

function createAlert(name, region, day) {
    const id = name + region + day.date;

    return {
        [id]: {
            title: `${name}, ${region}`,
            content: renderContent(name, day),
            comment: renderComment(day)
        }
    };
}

function renderContent(place, { date, day }) {
    const { maxtemp_c, mintemp_c, condition } = day;
    return (
        <div style={ styles.container }>
            <img src={ condition.icon } height={ 35 } draggable={ false } />
            <h3 style={ styles.noMargin }>{ place } - { moment(date).format('DD/MM/YYYY') }</h3>
            <h3 style={ styles.noMargin }>{ condition.text }</h3>
            <p style={ styles.noMarginBottom }>Min: { mintemp_c }ºC Máx: { maxtemp_c }ºC</p>
        </div>
    );
}

function renderComment({ date, astro, day }) {
    const { maxtemp_c, mintemp_c, condition } = day;
    return `Dia ${moment(date).format('DD/MM/YYYY')}: ${condition.text}, com **mínima** de ${mintemp_c}ºC e **máxima** de ${maxtemp_c}ºC.
        \n
        O **sol irá nascer** às ${astro.sunrise} e **se por** às ${astro.sunset}.
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
            const days = forecast.forecastday;

            const alerts = mergeAll(map(
                day => createAlert(name, region, day),
                days
            ));
            done(alerts);
        })
        .catch(() => done([]));
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
        description: 'De qual cidade você gostaria de acompanhar as previsões do tempo?',
        type: Text
    },
    language: {
        description: 'Idioma',
        type: OneOf(languages),
        default: 'pt'
    }
};

export default create(main, { params, primaryKey: true });