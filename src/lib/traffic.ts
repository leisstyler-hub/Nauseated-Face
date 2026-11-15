export interface TrafficReport {
 range:string;timezone:string;start:string;end:string;collectionStarted:string|null;
 visitors:number;visits:number;pageviews:number;returningVisitors:number;returningPercent:number|null;
 days:{date:string;visitors:number;visits:number;pageviews:number;returning_visitors:number;available?:boolean}[];
}
