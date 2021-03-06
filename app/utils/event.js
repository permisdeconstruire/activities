const moment = require('moment');
const uuidv5 = require('uuid/v5');
const elasticsearch = require('./elasticsearch');
const agenceMapping = require('./agenceMapping');

const PDC_NAMESPACE = '7065726d-6973-6465-636f-6e7374727569';

function uuid(string) {
  return uuidv5(string, PDC_NAMESPACE);
}

async function fire(
  agence,
  pilote,
  source,
  type,
  comment,
  data,
  { date = moment().toISOString(), forgeId = false } = {},
) {
  const params = {};
  const photoPrefix = 'ph_';

  const fullPilote = await elasticsearch.get(
    `${agenceMapping[agence].dbPrefix}pilotes`,
    pilote._id,
  );

  const photoPilote = { _id: pilote._id, pseudo: pilote.pseudo };

  Object.keys(fullPilote)
    .filter(key => key.startsWith(photoPrefix))
    .forEach(key => {
      if (key.startsWith(`${photoPrefix}date`)) {
        if (moment(fullPilote[key]).isValid()) {
          photoPilote[key.substr(photoPrefix.length)] = fullPilote[key];
        } else {
          photoPilote[key.substr(photoPrefix.length)] = moment('2000-01-01');
        }
      } else {
        photoPilote[key.substr(photoPrefix.length)] = fullPilote[key];
      }
    });

  const event = {
    date,
    type,
    comment,
    pilote: photoPilote,
    source,
    data,
  };
  if (forgeId !== false) {
    if (typeof forgeId === 'string') {
      params.id = uuid(forgeId);
    } else {
      params.id = uuid(
        forgeId.reduce((acc, key) => `${acc}_${event[key]}`, ''),
      );
    }
  }

  const result = await elasticsearch.index(
    `${agenceMapping[agence].eventPrefix}pdc`,
    event,
    params,
  );
  return result.body;
}

module.exports = {
  fire,
  uuid,
};
