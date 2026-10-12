import mongoose from "mongoose";

type MongooseCache = {
   conn: typeof mongoose | null;
   promise: Promise<typeof mongoose> | null;
};

declare global {
   // eslint-disable-next-line no-var
   var mongooseCache: MongooseCache | undefined;
}

const cached =
   global.mongooseCache ??
   (global.mongooseCache = {
      conn: null,
      promise: null,
   });

function getMongoUri(): string {
   const uri = process.env.MONGODB_URI;

   if (!uri) {
      throw new Error("Please define MONGODB_URI in .env.local");
   }

   return uri;
}

export async function connectToDatabase() {
   if (cached.conn) {
      return cached.conn;
   }

   if (!cached.promise) {
      cached.promise = mongoose
         .connect(getMongoUri(), {
            bufferCommands: false,
         })
         .catch((error: unknown) => {
            cached.promise = null;
            throw error;
         });
   }

   cached.conn = await cached.promise;
   return cached.conn;
}
