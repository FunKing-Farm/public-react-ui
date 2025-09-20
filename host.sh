./build_docker.sh public-react
docker run --network=host -p 3000:3000 -it public-react npm run dev