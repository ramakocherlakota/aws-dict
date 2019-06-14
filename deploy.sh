aws s3 cp --acl public-read index.html s3://dict-rkocherl-net/index.html
aws s3 cp --acl public-read js/dict.js s3://dict-rkocherl-net/js/dict.js
aws s3 cp --acl public-read js/LICENSE s3://dict-rkocherl-net/js/LICENSE
aws s3 cp --acl public-read js/jquery.preloaders.min.js s3://dict-rkocherl-net/js/jquery.preloaders.min.js
for file in js/img/*
do
    aws s3 cp --acl public-read $file s3://dict-rkocherl-net/$file
done
