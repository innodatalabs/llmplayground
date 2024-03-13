VERSION := $(shell node -e 'console.log(JSON.parse(require("fs").readFileSync("./package.json")).version)')

.PHONY: all build docker

all: 
	docker

docker:
	docker build . -t goldengate/llmplayground:$(VERSION) -f Dockerfile
	echo "Please do\n\tmake push"

push:
	docker push goldengate/llmplayground:$(VERSION)
