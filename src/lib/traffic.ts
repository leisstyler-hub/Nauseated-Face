export interface TrafficReport {
 range:string;timezone:string;start:string;end:string;collectionStarted:string|null;
 visitors:number;visits:number;pageviews:number;returningVisitors:number;returningPercent:number|null;
 days:{date:string;visitors:number;visits:number;pageviews:number;returning_visitors:number;available?:boolean}[];
 clicks?:number;clickers?:number;insightsStarted?:string|null;
 comparison?:{start:string;end:string;available:boolean;visitors:number;visits:number;pageviews:number};
 breakdowns?:Record<string,{label:string;pageviews:number;clicks:number;visitors:number;events:number}[]>;
 retention?:{days:number;eligible:number;returned:number}[];
 journey?:{label:string;visits:number}[];
}
