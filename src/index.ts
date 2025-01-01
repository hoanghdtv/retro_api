import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";


dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

interface IUserIP {
   ip: string;
   isp: string;
   country: string;
   countryCode: string;
   region: string;
   city: string;
   zip: string;
   org: string;
}

// 2. Create a Schema corresponding to the document interface.
const userSchema = new mongoose.Schema<IUserIP>({
  ip: { type: String, required: true },
  isp: { type: String, required: true },
  countryCode: { type: String, required: true },
});

// 3. Create a Model.
const User = mongoose.model<IUserIP>('Google', userSchema);

async function connectDB() {
    await mongoose.connect(process.env.MONGODB_URL || "");
    console.log("connect success to: " + process.env.MONGODB_URL);
}


async function getUserByIP(ip: string)
{
    return User.find({ip: ip});
}

function checkIpAddress(ip: string) {
  const ipv4Pattern = 
      /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = 
      /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

connectDB().then((result) => {
    
}).catch(err => console.log(err));

interface IPQuery {
   ip:string
}

app.get("/", async (req: Request, res: Response) =>{
  try {
    const {ip} = req.query as unknown as IPQuery;
    if(checkIpAddress(ip)){
        let user = await handleIP(ip);
        if(user != null){
          res.send({success:false, ip: user.ip, isp: user.isp, countryCode: user.countryCode});  
        } else{
          res.send({success:true}); 
        }
    }
    else{
      res.send({success:true,error: "ip_invalid"});
    }

  } catch(err) {
      console.log(err);
      res.send({success:true});
  }

  
});

app.listen(port, () => {
  console.log(`[server]: Server is running at ${port}`);
});

async function handleIP(ip: string) {
  let users : Array<any> = await getUserByIP(ip);
  if(users.length == 0 ){
      // check ip nay
      const url = (process.env.IP_CHECK_URL || "http://ip-api.com/json/") + ip;
      const response = await fetch(url);
      const obj = await response.json();
      //console.log(JSON.stringify(obj));
      
      var user = new User({
        ip:ip,
        isp:obj.isp || "us",
        countryCode: obj.countryCode || "us",
        country: obj.country || "us",
        zip: obj.zip || "100000",
        region: obj.region || "us" 
      });
      
      if(isBannedUser(user)){ 
          console.log("banned ip :" + user.ip + " , country : " + user.countryCode + " , isp: " + user.isp);
          await user.save();
          return user;
      } else {
          return null;
      }
  } else {
    let user = users[0];
    console.log("banned ip :" + user.ip + " , country : " + user.countryCode + " , isp: " + user.isp);
    return users[0];
  }
}

function isBannedUser(user: IUserIP){
  return user.countryCode.toLowerCase() == "in" || user.isp.toLowerCase().indexOf("google") != -1
}