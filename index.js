const express = require('express');
const multer =  require('multer');
const {v4: uuid} = require("uuid");
const path = require('path');
//AWS
const AWS = require('aws-sdk');
const config = new AWS.Config({
    accessKeyId :'AKIAW4GQ3AMBJNTOUXNM',
    secretAccessKey:'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',
    region:'ap-southeast-1'
});
const s3 = new AWS.S3({
    accessKeyId :'AKIAW4GQ3AMBJNTOUXNM',
    secretAccessKey:'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',
    region:'ap-southeast-1'   
});
AWS.config = config;
const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = 'DemoSP';
const CLOUD_FRONT_URL = 'https://d3manowha1ara2.cloudfront.net/';
const app  = express();
const data = require('./store');
const { S3 } = require('aws-sdk');
app.use(express.static('./templates'));
app.set('view engine','ejs');
app.set('views','./templates');



const generateId = () =>{
    
    return maxId;
};

const storage = multer.memoryStorage({
    destination(req, file, callback){
        callback(null,'');
    },
});

function checkFileType (file, cb){
    const fileTypes = /jpeg|jpg|png|gif/;

    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if(extname && mimetype){
        return cb(null, true);
    }
    return cb("Error : Image Only");
}

const upload = multer({
    storage,
    limits: {
        fileSize:2000000
    },
    fileFilter(req, file, cb){
        checkFileType(file, cb);
    },
});

app.post('/',upload.single('image'), (req, res)=>{
    const {ma_sp,ten_sp,soluong} = req.body;
    let result = /[0-9]/.test(soluong);
    if(!result){
        return  res.render('input', {report : {soluong:"* Số lượng phải là số",ten_sp: "Ten sp trung"} });
    }

    const image = req.file.originalname.split(".");

    const fileType = image[image.length -1];

    const filePath = `${uuid() + Date.now().toString()}.${fileType}`;
    const params ={
        Bucket: "uploads3toturialbucket",
        Key: filePath,
        Body: req.file.buffer
    } 

    
    s3.upload(params,(error, data) => {

        if(error){
            console.log('error = ', error);
            return res.send('Internal Serer Error');
        }else{
            let maxId = 0 ;
            const params ={
                TableName: tableName
            } 
            docClient.scan(params,(err,data)=>{
                // console.log(data.Items.length);
            for (let index = 0; index < data.Items.length; index++) {
                if  (maxId < parseInt(data.Items[index].ma_sp)){
                    maxId = parseInt(data.Items[index].ma_sp);
                    console.log(maxId);
                }
            }
            const newItem = {
                TableName: tableName,
                Item:{
                    "ma_sp": maxId+1+'',
                    "ten_sp": ten_sp,
                    "soluong": soluong,
                    "image_url": `${CLOUD_FRONT_URL}${filePath}`
                }
            }  
            docClient.put(newItem,(err,data)=>{
                if(err){
                    res.send('Internal Server Error');
                }else{
                    return  res.redirect('/');
                }
            });
            });
            
        }
    });
});

app.get('/',upload.fields([]), (req, res)=>{
    const params ={
        TableName: tableName
    } 

    docClient.scan(params,(err,data)=>{
        // console.log(data);
        if(err){
            res.send('Internal Server Erro');
        }else{
            return  res.render('index', {data : data.Items  });
        }
    });
});

app.get('/input', (req, res)=>{
     return  res.render('input',{report:{}});
});

app.listen(4000,()=>{
    console.log("Server is runing on 4000");
})

app.post('/delete',upload.fields([]),(req, res)=>{
    const listItems = Object.keys(req.body);

    if(listItems.length===0){
        return res.redirect('/');
    }

    const onDeleteItem = (index)=>{
        const params ={
            TableName : tableName,
            Key:{
                "ma_sp" : listItems[index]
            }
        }

        docClient.delete(params,(err,data)=>{
            if(err){
                res.send('Internal Server Error');
            }else{
                if(index>0){
                    onDeleteItem(index-1)
                }
                return  res.redirect('/');
            }
        });
    }
    onDeleteItem(listItems.length - 1);
});