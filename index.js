

/*Declare app */
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8070;
const axios = require('axios');

/* Get ping:
    status code 200
    return json
*/
app.get('/api/ping', (req, res) =>{
    res.status(200).json({
        "success": true
    });
    return;
});

/**
 * Get posts:
 * query params: 
 *   tags: string
 *   sortBy: string(optional)
 *   direction: string(optional)   
 */
app.get('/api/posts', async (req, res)=>{
    // console.log(req.query.length);
    const query = req.query;
    const queryRoute = 'https://api.hatchways.io/assessment/blog/posts';
    let posts = [];
    if (typeof query.tags === 'undefined'){
        errorHandler("Tags parameter is required", res);
        return;
    }else{
        tags = filterTags(query.tags);
        console.log(`Data with tags ${tags} have been requested.`);
        /** Handle multiple async request for tags */
        const fetchedData = tags.map((tag)=>{
            const data = axios.get(queryRoute+"?tag="+tag);
            return data;
        });
        try{
            const result = await Promise.all(fetchedData);
            /**Map data to array and remove duplicates*/
            result.map((item)=>{
                /** If found anything store it to the array*/
                if (item.data.posts !== 'undefined' && item.data.posts.length !== 0){
                    posts = posts.concat(item.data.posts);
                }
            });
            /**If the result is empty */
            if (result.length === 0){
                throw {status: 404, message: "Entry does not exist."};
            }
            const final_posts = posts.filter((thing, index, self) =>
                index === self.findIndex((t) => (
                t.authorId === thing.authorId && t.id === thing.id && t.author === thing.author
                ))
            );
        
            let sortType = "id";
            /**sortBy*/
            if(query.sortBy !== undefined){
                let sortBy = query.sortBy;
                //change everything to lower case
                sortBy = sortBy.toLocaleLowerCase();
                /**if sortby is not provided with a param */
                if(sortBy === "" || sortBy === "id"){
                    sortType = "id";
                } else if(sortBy === "reads" || sortBy === "likes" || sortBy === "popularity"){
                    sortType = sortBy;
                } else{
                    throw {status: 400, message: "sortBy parameter is invalid"}
                }
            }
            /**direction*/
            let direction = "asc";
            if(query.direction !== undefined){
                if(query.direction !== ""){
                    direction = query.direction;
                }
                if(direction !== 'asc' && direction !== 'desc'){
                    throw{status: 400, message: "direction parameter is invalid"};
                }
            }
            /**Sort the array with given params */
            final_posts.sort((a,b)=>{
                if(direction === 'asc'){
                    return a[sortType] - b[sortType];
                }
                return b[sortType] - a[sortType];
            });

            /**Send the posts back*/
            res.status(200).json({'posts':final_posts});
            console.log(`Returned posts in ${direction} ordered by ${sortType}`);

        } catch(err){res.status(err.status).json({"error": err.message})};
        
    };
    return;
});

function errorHandler (err, res) {
    res.status(400).json({
        "error": err
    });
}

function filterTags(tags){
    return tags.split(",");
}

app.listen(PORT, (err)=>{
    console.log(`it is listening on http://localhost:${PORT}`);
    if (err){
        res.status(400).json({"error": err});
    };
});