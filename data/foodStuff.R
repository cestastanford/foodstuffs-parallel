library(reshape2)

# read in
food <- read.csv("/Users/jheppler/Desktop/all_foods_no_na.csv", sep=",", header=T)

# columns are in all different kinds of formats..
str(food)

# turn all numeric columns into numbers
food.clean <- data.frame(foodname=food[,1], data.matrix(food[,6:53]))
str(food.clean)
# aaah!

# now remove rows with *all* NAs
food.clean <- food.clean[rowSums(is.na(food.clean)) < 48, ]

# make foodnames row names and remove foodname column, a little more convenient for math
row.names(food.clean) <- food.clean[,1]
food.clean$foodname <- NULL

# percentages: y(n+1)/y(n) 
food.yn <- food.clean[,-ncol(food.clean)] #remove last year
food.yn1 <- food.clean[,-1] # remove first year
food.pct <- (food.yn1/food.yn)*100

# Problem is that we get very large variation e.g. jump from 6 to 60 => 1000%!
# but we loose even more data, with NA in the preceding year

# perhaps better (?) Z-score: z-score = (x-μ)/σ
food.trans <- t(food.clean) # transform, because zcore works on columns by default
food.zscore <- food.trans  #this is a trick to get result as matrix and not a list
food.zscore[] <- scale(food.zscore) 

# transform for parallel coordinate
foodie <- t(food.zscore)

# write output
write.csv(foodie, "/Users/jheppler/Desktop/foodie_done.csv")
write.csv(food.pct, "/Users/jheppler/Desktop/food.pct.csv")

# problem still is that there are a lot of years with NAs, so perhaps aggregate?
