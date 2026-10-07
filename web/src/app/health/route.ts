
// gives playwright a url to ping before mocks are ready.
//  erases a Error: connect ECONNREFUSED 127.0.0.1:3001
export function GET() {
    return new Response("ok");
  }