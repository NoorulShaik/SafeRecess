import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export const LEVEL_NAMES = ['Good / Satisfactory', 'Moderate', 'Poor', 'Very Poor / Severe'];

const snsClient = new SNSClient({});

export function recommendationForLevel(level) {
  return [
    'Outdoor activities can continue; keep an eye on sensitive students.',
    'Sensitive students should take breaks and outdoor activity should be monitored.',
    'Move assembly and sports indoors; avoid prolonged outdoor exposure.',
    'Keep students indoors and cancel outdoor activities until conditions improve.',
  ][level] || 'Air quality data is unavailable; check again before outdoor activities.';
}

export function formatAlertMessage(school, fromLevel, toLevel, isDemo = false) {
  const prefix = isDemo ? '[DEMO] ' : '';
  const credits = (school.attribution || [])
    .map(item => item.name)
    .filter(Boolean)
    .join('; ');
  return {
    subject: `${prefix}Alert: ${school.display_name} air quality now ${LEVEL_NAMES[toLevel]}`,
    message: [
      `SafeRecess alert for ${school.display_name}`,
      `Air quality changed from ${LEVEL_NAMES[fromLevel] || 'unavailable'} to ${LEVEL_NAMES[toLevel]}.`,
      recommendationForLevel(toLevel),
      '',
      'Estimated, India (CPCB) categories, based on PM2.5 and PM10.',
      credits ? `Data credits: ${credits}` : 'Data credits: World Air Quality Index Project and the originating agency.',
    ].join('\n'),
  };
}

export async function sendAlert(school, fromLevel, toLevel, options = {}) {
  const { isDemo = false, publish = defaultPublish } = options;
  const content = formatAlertMessage(school, fromLevel, toLevel, isDemo);
  const result = await publish({
    TopicArn: process.env.ALERT_TOPIC_ARN,
    Subject: content.subject,
    Message: content.message,
  });
  return { ...content, sns_status: result?.MessageId ? 'accepted by SNS' : 'sent' };
}

async function defaultPublish(params) {
  if (!params.TopicArn) {
    throw new Error('ALERT_TOPIC_ARN environment variable is required');
  }
  return snsClient.send(new PublishCommand(params));
}
