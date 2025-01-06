require('dotenv').config();
const http=require("http");
const express=require("express");
const app=express();
const multer=require("multer");
const {storage}=require("./cloudConfig.js")
const upload=multer({storage})
const Razorpay = require('razorpay');
const crypto = require('crypto');
const dbUrl=process.env.ATLASDB_URL;

const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));  // For parsing application/x-www-form-urlencoded
app.use(bodyParser.json());  // For parsing application/json


const passport=require("passport");
const LocalStratergy=require("passport-local");
const User=require("./models/user.js");
const flash=require("connect-flash");

// let adminId="admin";
// let password="admin1234";

const cookieParser=require("cookie-parser");
app.use(cookieParser("sai-guggila"));
const session=require("express-session");
const MongoStore = require('connect-mongo');
const store=MongoStore.create({
  mongoUrl:dbUrl,
  crypto:{
    secret:process.env.SECRET
  },
  touchAfer:24*3600
});

store.on("error",(err)=>{
  console.log("error in mongo session store",err)
})

app.use(session({store:store,secret:process.env.SECRET,resave:false,saveUninitialized:true}));


app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
passport.use(new LocalStratergy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const path=require("path")
const ejsMate=require("ejs-mate")
const mongoose=require("mongoose");
const methodOverride=require("method-override");
app.use(methodOverride('_method'))
app.use(express.static("public"))
app.use(express.static(path.join(__dirname,"/public/js")));
app.use(express.static(path.join(__dirname,"/public/css")));
app.use(express.urlencoded({extended:true}));
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"/views"));
app.engine("ejs",ejsMate)
const Story=require("./models/successStories");
const Post = require("./models/post.js");
const Job = require("./models/job.js")
const Message = require('./models/message');
const Event=require("./models/event.js");
const Announcement=require("./models/announcement.js");
const Feedback=require("./models/feedback.js");
const ApprovedRegistration=require("./models/regno.js");
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);






main()
.then((res)=>{
    console.log("connected");
})
.catch((err)=>{
    console.log(err);
})
async function main()
{
  await mongoose.connect(dbUrl);
}




// Store user socket IDs
let users = {};

// Socket.io Connection Handling
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('userConnected', (userId) => {
    users[userId] = socket.id;
    console.log(`User ${userId} connected with socket ID ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    for (let userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        break;
      }
    }
  });

  socket.on('chat message', async ({ senderId, receiverId, message }) => {
    const newMessage = new Message({ senderId, receiverId, message });
    await newMessage.save();

    socket.emit('chat message', { senderId, receiverId, message });

    if (users[receiverId]) {
      io.to(users[receiverId]).emit('chat message', { senderId, receiverId, message });
    }
  });
  // Handle video call events
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('signal', (data) => {
    io.to(data.room).emit('signal', data);
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room ${room}`);
  });
});

// Route to Save Chat via POST (Optional)
app.post('/chat/:receiverId', async (req, res) => {
  const { message } = req.body;
  const senderId = req.user._id;
  const { receiverId } = req.params;

  try {
    const newMessage = new Message({ senderId, receiverId, message });
    const savedMessage = await newMessage.save();

    if (users[receiverId]) {
      io.to(users[receiverId]).emit('chat message', { senderId, receiverId, message });
    }

    res.status(201).json(savedMessage);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Route to Get Chat History and Render Chat Page
app.get('/chat/:userId', async (req, res) => {
  const currentUser = req.user._id;
  const chatPartnerId = req.params.userId;

  const messages = await Message.find({
    $or: [
      { senderId: currentUser, receiverId: chatPartnerId },
      { senderId: chatPartnerId, receiverId: currentUser }
    ]
  }).sort({ timestamp: 1 });

  res.render('chat', { currentUser, chatPartner: { _id: chatPartnerId }, messages });
});



const port=3000;
server.listen(port,()=>{
    console.log("listening to the port "+port);
})

app.use((req,res,next)=>{
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser=req.user;

  next();
})

app.get("/home",async (req,res)=>{
  let posts=await Post.find();
    res.render("home.ejs",{posts})
})


app.get("/",(req,res)=>{
  res.render("landing.ejs");
})


app.get("/demouser",async (req,res)=>{
  let fakeUser=new User({
    email:"saiguggilla@gmail.com",
    username:"saiguggilla22"
  });

  let registeredUser=await User.register(fakeUser,"mypass123");
  console.log(registeredUser);
  res.send(registeredUser);
})


//posts


//to get all the posts
app.get("/posts",async (req,res)=>{

    let posts=await Post.find();
    res.render("allposts.ejs",{posts});
  
})

//to view only particular post
app.get("/posts/:id",async(req,res)=>{
   let {id}=req.params;
   
   let post=await Post.findById(id);
   let userId=post.userId;
   let user=await User.findById(userId);
   console.log(res.locals.currentUser);
   res.render("onepost.ejs",{post,user});
})

//create new post
app.get("/users/:id/newpost",async (req,res)=>{
  let {id}=req.params;
  let user=await User.findById(id);
  res.render("newpost.ejs",{user});

})
//to uplad the new post
app.post("/users/:id/newpost",upload.single('img'),async(req,res)=>{
  let {id}=req.params;
  let url=req.file.path;
  let filename=req.file.filename;
  let {title,content}=req.body;
  let newpost=new Post({
     userId:id,
     title:title,
    
     content:content,
  });
  newpost.img={url,filename};
  let savedpost=await newpost.save();
  console.log(savedpost)
  await User.findByIdAndUpdate(
    id,
    { $push: { posts: savedpost._id } },
    { new: true, useFindAndModify: false }
);
res.redirect("/posts")

});

//edit the post
app.get("/users/:id/editpost",async(req,res)=>{
     let {id}=req.params;
     let post=await Post.findById(id);
     res.render("editpost.ejs",{post});

})

app.patch("/users/:id/editpost",upload.single("img"),async(req,res)=>{
   let {id}=req.params;
   let {title,content}=req.body;
  let post= await Post.findByIdAndUpdate(id,{title:title,content:content});
   if(typeof req.file!=="undefined")
   {
    let url=req.file.path;
    let filename=req.file.filename;
    post.img={url,filename};
   await post.save()
   }
   

   
   res.redirect("/posts");
})


app.delete("/users/:id/deletepost",async(req,res)=>{
  let {id}=req.params;
  let userId=res.locals.currentUser._id.toString();
  console.log(userId);
  let modifieduser=await User.findByIdAndUpdate(userId, {
    $pull: { posts: id }
});
console.log("modified user")
console.log(modifieduser)
console.log(res.locals.currentUser);
   await Post.deleteOne({_id:id});
   res.redirect("/posts");
})







//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//stories


//to get all the stories
app.get("/stories",async (req,res)=>{
  let stories=await Story.find();
  let success=res.locals.success;
  let error=res.locals.error;
  res.render("allstories.ejs",{stories,success,error});
 
})

  //create new stories
  app.get("/stories/new",(req,res)=>{
    
      if(req.isAuthenticated())
      {
        res.render("newstory.ejs");
      }
      else{
        res.redirect("/login");
      }
   
   
 })
  //to view only particular stories
  app.get("/stories/:id",async (req,res)=>{
    let {id}=req.params;
    // let userId=res.locals.currentUser._id.toString();
    // let user=await User.findById(userId);
    let story=await Story.findById(id).populate("userId");
    console.log(story);
    res.render("onestory.ejs",{story});
  })
  
  
  
  //to uplad the new stories
  
  app.post("/stories/new",async(req,res)=>{
    let userId=res.locals.currentUser._id.toString();
    let {title:title,content:content}=req.body;
    let newStory=new Story({
         userId: res.locals.currentUser._id,
        title:title,
        content:content,
        publishedAt:new Date(),
        isFeatured:true
    });

    let savedstory=await newStory.save()
    

    await User.findByIdAndUpdate(
      userId,
      { $push: { stories: savedstory._id } },
      { new: true, useFindAndModify: false }
  );
    res.locals.success=req.flash("success");
    res.locals.failure=req.flash("failure");
      res.redirect("/stories");
  })
  
  //to edit the post
  
  //the form to edit the post
  app.get("/stories/:id/edit",async(req,res)=>{
      let {id}=req.params;
      let story=await Story.findById(id);
      console.log(story);
      res.render("editstory.ejs",{story});

  })
  
  //now post the edited stories into the database
  
  app.patch("/stories/:id/edit",async (req,res)=>{
    let {id}=req.params;
    console.log(id);
    let {title:title,content:content}=req.body;
    if(req.isAuthenticated())
    {
      let edited=await Story.findByIdAndUpdate(id,{title:title,content:content}, { new: true } );
      console.log(edited);
      res.redirect("/stories");
    }
    else{
      res.redirect("/login");
    } 
});
  
  //dlete the post
  
  app.delete("/stories/:id/delete",async(req,res)=>{
    if(!req.isAuthenticated())
    {
      res.redirect("/login");
    }
    else{
      // let {id}=req.params;
      // console.log(id);
      // let deleted=await Story.findByIdAndDelete(id);
      // console.log(deleted);
      // res.redirect("/stories");
      let {id}=req.params;
      let userId=res.locals.currentUser._id.toString();
    
      let modifieduser=await User.findByIdAndUpdate(userId, {
        $pull: { stories: id }
    });
    await Story.findByIdAndDelete(id);
    console.log(modifieduser);

    }
    
    res.redirect("/stories");
  });
  

//-------------------------------------------------------------------------------------------------------------------------------------------------------

//login logout section


app.get("/signup",(req,res)=>{
  res.render("signup.ejs"); 
})

app.post("/signup",upload.single('profilePicture'),async (req,res)=>{
  console.log(req.body);
 
  let url=req.file.path;
  let filename=req.file.filename;
  console.log(url+"----"+filename)
let regno=req.body.regno;
let ans=await ApprovedRegistration.findOne({registrationNumber:regno});
if(!ans)
{
 res.render("error.ejs");
}
else
{
  let {username,email,password,graduationYear,fieldOfStudy,industry,location,profilePicture,bio}=req.body;
  const newUser=new User({
    username:username,
    email:email,
    graduationYear:graduationYear,
    fieldOfStudy:fieldOfStudy,
    industry:industry,
    location:location,
   
    bio:bio,
    dateJoined:new Date

  });
  newUser.profilePicture={url,filename};
 let savedUser=await User.register(newUser,password);
 console.log(savedUser);
 req.login(savedUser,(err)=>{
  if(err)
  {
    console.log(err);
  }
  req.flash("success","user was registered succesfully");
 res.redirect("/");
 })
}

  
 
})

app.get("/login",(req,res)=>{
  res.render("login.ejs");
})

app.post("/login",passport.authenticate("local",{failureRedirect:"/login", failureFlash:true}),async(req,res)=>{

 
  if (req.body.username==="admin"){
    req.flash("success", "You have been successfully logged in as admin");
    res.redirect("/admin")
  }
  else{
    req.flash("success", "You have been successfully logged in");
    res.redirect("/");
  }
  
  
})

app.get("/logout",(req,res)=>{
    req.logout((err)=>{
      console.log(err);
    });
    req.flash("success","you have been logged out successfully");
    res.redirect("/");
})

app.get("/logintypes",(req,res)=>{
  res.render("logintype.ejs");
})

// -------------------------------------------------------------------------------------------------------------------------------------------------

//all users section

app.get("/users",async (req,res)=>{
  let users=await User.find();
  res.render("allUsers.ejs",{users});
})

app.get("/users/:id",async (req,res)=>{
  let {id}=req.params;
   let user=await User.findById(id);
   res.render("oneUser.ejs",{user});
})

//----------------------------------------------------------------------------------------------------------------------------------------------------------------

//jobs

app.get("/jobs",async (req,res)=>{
  let jobs = await Job.find()
  res.render("alljobs.ejs",{jobs})

})

app.get("/jobs/new",(req,res)=>{
  res.render("newjob.ejs");

  
})

app.post("/jobs/new",async (req,res)=>{
  let {title,description,location,experience,company,link}=req.body;
  let newjob=new Job({
    title:title,
    description:description,
    location:location,
    company:company,
    experience:experience,
    link:link,
    userId:res.locals.currentUser._id,
    postedAt:new Date()
  });
  let userId=res.locals.currentUser._id.toString();
  let user=await User.findById(userId);
  console.log(user)
  let savedjob=await newjob.save();
  console.log(savedjob);
  await User.findByIdAndUpdate(
    userId,
    { $push: { jobs: savedjob._id } },
    { new: true, useFindAndModify: false }
);
  res.redirect("/jobs")

})  

app.delete("/jobs/:id",async(req,res)=>{
  let {id}=req.params;
  let userId=res.locals.currentUser._id.toString();
  let modifieduser=await User.findByIdAndUpdate(userId, {
    $pull: { jobs: id }
});
  await Job.findByIdAndDelete(id);
  res.redirect("/jobs");
})


//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------



app.get("/admin",async (req,res)=>{
  let posts=await Post.find();
  let users=await User.find();
  let stories=await Story.find();
  let jobs=await Job.find();
  res.render("admin.ejs",{posts,users,stories,jobs});
  
})

app.get("/adminlogin",(req,res)=>{
  res.render("login.ejs");
})

app.post("/adminlogin",passport.authenticate("local",{failureRedirect:"/adminlogin", failureFlash:true}),async(req,res)=>{
  req.flash("success", "You have been successfully logged in");

  res.redirect("/admin");
  
})

app.delete("/admin/posts/:id/delete",async (req,res)=>{
     let {id}=req.params;
     let post=await Post.findById(id);
     let userId=post.userId.toString();

     await Post.findByIdAndDelete(postId);
     let modifieduser=await User.findByIdAndUpdate(userId, {
      $pull: { posts: id }
  });


     res.redirect("/admin");
})

app.delete("/admin/stories/:id/delete",async(req,res)=>{
  let {id}=req.params;
  let story=await Story.findById(id);
  let userId=story.userId.toString();

  await Story.findByIdAndDelete(id);
  let modifieduser=await User.findByIdAndUpdate(userId, {
   $pull: { stories: id }
});


  res.redirect("/admin")
})


app.delete("/admin/jobs/:id/delete",async(req,res)=>{
  let {id}=req.params;
  let job=await Job.findById(id);
 
  let userId=job.userId.toString();
  console.log(job)
  

  await Job.findByIdAndDelete(id);
  let modifieduser=await User.findByIdAndUpdate(userId, {
   $pull: { jobs: id }
});


  res.redirect("/admin")
})


app.delete("/admin/users/:id/delete",async(req,res)=>{
  const userId = req.params.id;

  // Delete user's posts
  await Post.deleteMany({ userId: userId });

  // Delete user's jobs
  await Job.deleteMany({ userId: userId });

  // Delete user's stories
  await Story.deleteMany({ userId: userId });

  // Delete the user
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.redirect("/admin")
})



//-------------------------------------------------------------------------------------------------------------------------------
//profile of the user
app.get("/profile/:id", async (req, res) => {
  try { 
    const { id } = req.params;

    // Find the user by ID and populate related data
    const user = await User.findById(id)
      .populate('posts')
      .populate('jobs')
      .populate('stories');

    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/');
    }

    // Render the profile page with the user's data
    res.render('profile', { user });
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred while fetching the profile');
    res.redirect('/');
  }
});


//------------------------------------------------------------------------------------------------------------------------------------------------------------------

//events

// View all events
app.get('/events', async (req, res) => {
  const events = await Event.find().populate('createdBy');
  res.render('allEvents.ejs', { events });
});

// Form to create a new event
app.get('/events/new', (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash('error', 'You must be logged in to create an event');
    return res.redirect('/login');
  }
  res.render('newEvent.ejs');
});

// Create a new event
app.post('/events/new', async (req, res) => {
  const { title, description, date, location } = req.body;
  const newEvent = new Event({
    title,
    description,
    date,
    location,
    createdBy: req.user._id
  });
  await newEvent.save();
  res.redirect('/events');
});

// View a single event
app.get('/events/:id', async (req, res) => {
  const event = await Event.findById(req.params.id).populate('createdBy', 'username').populate('attendees', 'username');
  if (!event) {
    req.flash('error', 'Event not found');
    return res.redirect('/events');
  }
  res.render('oneEvent.ejs', { event });
});

// Register for an event
app.post('/events/:id/register', async (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash('error', 'You must be logged in to register for an event');
    return res.redirect('/login');
  }

  const event = await Event.findById(req.params.id);
  if (!event) {
    req.flash('error', 'Event not found');
    return res.redirect('/events');
  }

  // Check if the user is already registered for the event
  if (event.attendees.includes(req.user._id)) {
    req.flash('info', 'You are already registered for this event');
    return res.redirect(`/events/${req.params.id}`);
  }

  // Register the user for the event
  event.attendees.push(req.user._id);
  await event.save();

  req.flash('success', 'Successfully registered for the event');
  res.redirect(`/events/${req.params.id}`);
});


// Delete an event (for admins)
app.delete('/events/:id/delete', async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) {
    req.flash('error', 'Event not found');
    return res.redirect('/events');
  }
  res.redirect('/events');
});

//feedback on the events
app.post('/events/:id/feedback', async (req, res) => {
  const event = await Event.findById(req.params.id);
  const feedback = {
    user: req.user._id,
    message: req.body.message
  };
  event.feedbacks.push(feedback);
  await event.save();
  res.redirect(`/events/${event._id}`);
});

app.delete("/events/:id",async (req,res)=>{
  let {id}=req.params;
  await Event.findByIdAndDelete(id);
  res.redirect("/events");
})
//----------------------------------------------------------------------------------------------------------------------------------------------
//donation 

const razorpay = new Razorpay({
  key_id: "szxd233edsff",
  key_secret: "czxv34352we",
});

app.get("/donate",(req,res)=>{
  res.render("donation.ejs")
})

// Route to create an order and render payment page
app.post('/create-order', async (req, res) => {
  const { amount } = req.body;

  const options = {
    amount: amount * 100, // Amount in paise (INR)
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.render('payment', {
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      orderId: order.id,
      currency: order.currency,
    });
  } catch (error) {
    res.status(500).send('Error creating order');
  }
});


//------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//college feedbacks

app.get("/feedback",async (req,res)=>{
  let feedbacks=await Feedback.find().populate("userId");
  res.render("allfeedbacks.ejs",{feedbacks})
})

app.get("/feedback/new",(req,res)=>{
  if(req.isAuthenticated())
  {
    
    res.render("newfeedback.ejs");
  }
  else
  {
    res.redirect("/login");
  }
  
})

app.post("/feedback/new", async (req, res) => {
  if (req.isAuthenticated()) {
      try {
          const { title, message } = req.body;

          // Get the current user
          const user = await User.findById(req.user._id);

          // Check if the user has already given feedback
          if (user.hasGivenFeedback) {
              return res.redirect("/feedback"); // Redirect to feedback page if already given
          }

          // Create new feedback
          const newFeedback = new Feedback({
              userId: user._id,
              title: title,
              message: message,
              dateSubmitted: new Date()
          });

          // Save the feedback
          await newFeedback.save();

          // Update user to indicate feedback has been given
          user.hasGivenFeedback = true;
          await user.save();

          // Redirect to feedback page
          res.redirect("/feedback");
      } catch (error) {
          console.error("Error processing feedback:", error);
          res.redirect("/feedback"); // Redirect to feedback page on error
      }
  } else {
      res.redirect("/login");
  }
});


app.get("/feedback/:id", async (req, res) => {
  try {
      const feedbackId = req.params.id;
      const feedback = await Feedback.findById(feedbackId)
          .populate("userId", "username") // Optionally populate userId with username
          .exec();

      if (!feedback) {
          return res.status(404).send("Feedback not found");
      }

      res.render("onefeedback", { feedback });
  } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).send("Server error");
  }
});

// Delete Feedback Route
app.post("/feedback/:id/delete", async (req, res) => {
  if (req.isAuthenticated()) {
      try {
          const feedbackId = req.params.id;
          const feedback = await Feedback.findById(feedbackId);

          // Ensure the user is authorized to delete the feedback
          if (req.user._id.equals(feedback.userId._id) || req.user.isAdmin) {
              await Feedback.findByIdAndDelete(feedbackId);
              res.redirect("/feedback");
          } else {
              res.status(403).send("Not authorized to delete this feedback.");
          }
      } catch (err) {
          console.error(err);
          res.status(500).send("An error occurred while deleting the feedback.");
      }
  } else {
      res.redirect("/login");
  }
});


//inserting the registration numbers into the db
// app.get("/insertdb",async (req,res)=>{
//   const regnos=[
//     {
//     registrationNumber:"22b91a0588"
//   },
//   {
//     registrationNumber:"22b91a0590"
//   },
//   {
//     registrationNumber:"22b91a0591"
//   },
//   {
//     registrationNumber:"22b91a0592"
//   }];
//   await ApprovedRegistration.insertMany(regnos);

// })

// Route to render video chat page
app.get('/videochat/:roomId', (req, res) => {
  res.render('videochat', { roomId: req.params.roomId });
});

