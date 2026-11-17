import {guestStore,guestUnavailable} from '@/lib/guests';
export async function GET(request:Request){
 try{
  const url=new URL(request.url);
  return Response.json(await guestStore().publicReviews({jurisdictionId:url.searchParams.get('jurisdictionId'),officialId:url.searchParams.get('officialId')},Number(url.searchParams.get('offset')??0)),{headers:{'Cache-Control':'no-store'}});
 }catch{return guestUnavailable();}
}
