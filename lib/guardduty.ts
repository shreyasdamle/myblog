import cdk = require('@aws-cdk/core');
import guardduty = require('@aws-cdk/aws-guardduty');
import events = require('@aws-cdk/aws-events');
import eventTargets = require('@aws-cdk/aws-events-targets');
import sns = require('@aws-cdk/aws-sns');
import snsSubscription = require('@aws-cdk/aws-sns-subscriptions');

export interface GuardDutyNotifierProps {
    
    //Identification string for GD alerts in email
    identificationString: string;

    //Email address to receive GD notifications
    email: string;
}

export class GuardDutyNotifier extends cdk.Construct {
    constructor(scope: cdk.Stack, id: string, props: GuardDutyNotifierProps) {
        super(scope, id)

    //Enable GD in the AWS region
    new guardduty.CfnDetector(this, "GuardDutyDetector", { enable: true });

    //Configure GD to email any security findings
    const guardDutyTopic = new sns.Topic(this, "GuardDutyNotificationTopic");
    guardDutyTopic.addSubscription(new snsSubscription.EmailSubscription(props.email));
    const eventRule = new events.Rule(this, "GuardDutyEventRule", {
        eventPattern: {
            source: ["aws.guardduty"],
            detailType: ["GuardDuty Finding"]
        }
    });

    //Format for email
    eventRule.addTarget(new eventTargets.SnsTopic(guardDutyTopic, {
        message: events.RuleTargetInput.fromText(`WARNING: AWS GuardDuty has discovered a ${events.EventField.fromPath('$.detail.type')} security issue for ${props.identificationString} (${events.EventField.fromPath('$.region')}). Please go to https://${events.EventField.fromPath('$.region')}.console.aws.amazon.com/guardduty/ to find out more details.`)
    }));
  }
}