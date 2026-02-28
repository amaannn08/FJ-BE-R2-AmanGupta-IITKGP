import express from "express"
const app = express()


app.post("/user",function(req,res){
    
})

try {
    app.listen(5000,()=>{
        console.log("Server Running at PORT 5000")
    });
} catch (error) {
    console.log("Error Running the Server")
}
