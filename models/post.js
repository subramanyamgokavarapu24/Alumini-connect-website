const mongoose=require("mongoose");
const postSchema=new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:{type:String,required:true},
    img:{
        url:String,
        filename:String
    },
    content:{type:String,required:true},
    postedAt:{type:Date,default:Date.now}
});

const Post=mongoose.model("Post",postSchema);
module.exports=Post;