all:
	docker run --rm -it -p 3000:3000 $$(docker build -q .)