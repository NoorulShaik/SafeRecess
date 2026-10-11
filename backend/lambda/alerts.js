import { SNSClient, PublishCommand, SubscribeCommand, SetSubscriptionAttributesCommand, GetSubscriptionAttributesCommand, ListSubscriptionsByTopicCommand } from '@aws-sdk/client-sns';

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

  // Always include the data credits line and the sample school notice as per FRONTEND.md
  const creditsLine = credits ? `Data credits: ${credits}` : 'Data credits: World Air Quality Index Project and the originating agency.';

  return {
    subject: `${prefix}Alert: ${school.display_name} air quality now ${LEVEL_NAMES[toLevel]}`,
    message: [
      `SafeRecess alert for ${school.display_name}`,
      `Air quality changed from ${LEVEL_NAMES[fromLevel] || 'unavailable'} to ${LEVEL_NAMES[toLevel]}.`,
      recommendationForLevel(toLevel),
      '',
      'Estimated, India (CPCB) categories, based on PM2.5 and PM10.',
      creditsLine,
      'Sample school: demo project.',
    ].join('\n'),
  };
}

export async function sendAlert(school, fromLevel, toLevel, options = {}) {
  const { isDemo = false, publish = defaultPublish } = options;
  const topicArn = isDemo ? process.env.DEMO_ALERTS_TOPIC_ARN : process.env.SCHOOL_ALERTS_TOPIC_ARN;

  if (!topicArn) {
    throw new Error(isDemo ? 'DEMO_ALERTS_TOPIC_ARN environment variable is required' : 'SCHOOL_ALERTS_TOPIC_ARN environment variable is required');
  }

  const content = formatAlertMessage(school, fromLevel, toLevel, isDemo);
  const result = await publish({
    TopicArn: topicArn,
    Subject: content.subject,
    Message: content.message,
    MessageAttributes: {
      school_id: {
        DataType: 'String',
        StringValue: school.school_id,
      },
      audience: {
        DataType: 'String',
        StringValue: isDemo ? 'demo' : 'public',
      },
    },
  });
  return { ...content, sns_status: result?.MessageId ? 'accepted by SNS' : 'sent' };
}

export async function subscribeEmailToSchool(email, schoolIds) {
  const topicArn = process.env.SCHOOL_ALERTS_TOPIC_ARN;
  if (!topicArn) throw new Error('SCHOOL_ALERTS_TOPIC_ARN environment variable is required');

  // Ensure schoolIds is an array
  const idsArray = Array.isArray(schoolIds) ? schoolIds : [schoolIds];

  // Remove duplicates and filter out empty values
  const uniqueSchoolIds = [...new Set(idsArray.filter(id => id && id.trim()))];

  if (uniqueSchoolIds.length === 0) {
    throw new Error('At least one school must be selected');
  }

  // List existing subscriptions for this email endpoint
  let existingSubscriptionArn = null;
  let existingFilterPolicy = null;
  try {
    const subscriptions = await snsClient.send(new ListSubscriptionsByTopicCommand({
      TopicArn: topicArn
    }));

    // Find subscription matching this email
    for (const sub of subscriptions.Subscriptions || []) {
      if (sub.Protocol === 'email' && sub.Endpoint === email) {
        existingSubscriptionArn = sub.SubscriptionArn;
        // Note: We can't get filter policy from ListSubscriptionsByTopic, we need to get attributes separately
        break;
      }
    }
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    // Continue to create new subscription if we can't list existing ones
  }

  // Get existing filter policy if we have a confirmed subscription
  if (existingSubscriptionArn && existingSubscriptionArn !== 'pending confirmation' && existingSubscriptionArn !== 'deleted') {
    try {
      const attrsResponse = await snsClient.send(new GetSubscriptionAttributesCommand({
        SubscriptionArn: existingSubscriptionArn
      }));

      if (attrsResponse.Attributes && attrsResponse.Attributes.FilterPolicy) {
        try {
          existingFilterPolicy = JSON.parse(attrsResponse.Attributes.FilterPolicy);
        } catch (parseError) {
          console.error('Error parsing existing filter policy:', parseError);
          // Continue with null filter policy
        }
      }
    } catch (error) {
      console.error('Error getting subscription attributes:', error);
      // Continue to treat as if we need to create/update
    }
  }

  let subscriptionArn = existingSubscriptionArn;
  let isNewSubscription = false;

  if (existingSubscriptionArn && existingSubscriptionArn !== 'pending confirmation' && existingSubscriptionArn !== 'deleted') {
    // Update existing confirmed subscription with merged filter policy
    try {
      // Merge school IDs: existing ones + new ones, removing duplicates
      const existingSchoolIds = Array.isArray(existingFilterPolicy?.school_id)
        ? existingFilterPolicy.school_id
        : [];

      const mergedSchoolIds = [...new Set([...existingSchoolIds, ...uniqueSchoolIds])];

      await snsClient.send(new SetSubscriptionAttributesCommand({
        SubscriptionArn: existingSubscriptionArn,
        AttributeName: 'FilterPolicy',
        AttributeValue: JSON.stringify({ school_id: mergedSchoolIds }),
      }));
      await snsClient.send(new SetSubscriptionAttributesCommand({
        SubscriptionArn: existingSubscriptionArn,
        AttributeName: 'FilterPolicyScope',
        AttributeValue: 'MessageAttributes',
      }));

      subscriptionArn = existingSubscriptionArn;
    } catch (error) {
      console.error('Error updating subscription attributes:', error);
      // If update fails, fall back to creating new subscription
      subscriptionArn = null;
    }
  } else {
    // Create new subscription
    isNewSubscription = true;
    try {
      const subscription = await snsClient.send(new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: 'email',
        Endpoint: email,
        ReturnSubscriptionArn: true,
      }));
      subscriptionArn = subscription.SubscriptionArn;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Set filter policy for new subscription
  if (isNewSubscription && subscriptionArn && subscriptionArn !== 'pending confirmation') {
    try {
      await snsClient.send(new SetSubscriptionAttributesCommand({
        SubscriptionArn: subscriptionArn,
        AttributeName: 'FilterPolicy',
        AttributeValue: JSON.stringify({ school_id: uniqueSchoolIds }),
      }));
      await snsClient.send(new SetSubscriptionAttributesCommand({
        SubscriptionArn: subscriptionArn,
        AttributeName: 'FilterPolicyScope',
        AttributeValue: 'MessageAttributes',
      }));
    } catch (error) {
      console.error('Error setting subscription attributes:', error);
      // Don't fail the subscription if attribute setting fails
    }
  }

  // Determine status
  let status = 'confirmation required';
  if (subscriptionArn === 'pending confirmation') {
    status = 'confirmation required';
  } else if (subscriptionArn && subscriptionArn !== 'deleted') {
    status = 'confirmed';
  }

  return { status, subscriptionArn };
}

async function defaultPublish(params) {
  if (!params.TopicArn) {
    throw new Error('ALERT_TOPIC_ARN environment variable is required');
  }
  return snsClient.send(new PublishCommand(params));
}