import express from 'express'
import { PrismaClient } from '@prisma/client'
import { CreateProduct,PatchProduct} from '.../validate.js'


const prisma = new PrismaClient // 클래스라서 new 키워드로 인스턴스를 만듦

const app = express()
app.use(express.json())

const productRouter = express.Router()

/*********product**********/

productRouter.route('/products')
    //상품 등록 API (name, description, price, tags를 입력하여 상품을 등록)
    .post('/products', async(req,res) => { //create 메소드는 비동기 작업  -> async/await 사용
        try{
            const newProductData = CreateProduct.safeParse(req.body); // zod 유효성 검사 및 할당

            const product = await prisma.product.create({  // 선언은 res.json(product) 같은 곳에 활용, prisma.모델명.메서드명()
                data: newProductData
            })
            res.status(201).json(product)
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.errors})
            } else { 
                res.status(500).json({message: '서버 오류가 발생했습니다.'})
            }
        }   
    })

    //상품 목록 조회 API 
    /* id, name, price, createdAt를 조회
    offset 방식의 페이지네이션 기능을 포함
    최신순(recent)으로 정렬
    name, description에 포함된 단어로 검색 가능*/
    .get( async(req,res) => {
        const { offset = 0, order = 'recent', keyword = ''} = req.query
        let orderBy // 조건에 따라 값이 바뀌는 정렬 기준을 저장
        switch (order) {
            case 'old' :
                orderBy = { createdAt: 'asc'} // 정렬 방식을 orderBy에 할당
                break
            case 'recent':
                orderBy = { createdAt: 'desc'}
        }

        const where = { //필터링 조건을 담을 객체 (Prisma의 where 옵션에 사용됨) 
            OR: [ // 아래 조건들 중 "하나라도 참이면" 결과에 포함시킴
                { name: { // 상품 이름 필드
                    contains: keyword,  // contains: 문자열 안에 포함되어 있는지 검사 , name에 keyword(검색어)를 포함하고 있으면 true
                    mode: 'insensitive' // mode: 대소문자 구분 옵션 ( 'default' or 'insensitive' )
                    } 
                },
                { description: { // 상품 설명 필드
                    contains: keyword, //  description에 keyword가 포함되어 있으면 true
                    mode: 'insensitive'//  대소문자 무시하고 검색
                    } 
                }
            ]
        };

        const products = await prisma.product.findMany({
            where, // 조건 필터링 
            skip: offset, // 앞에 몇 개 건너뛸지
            take: 10,
            orderBy,// 정렬
            select: { // 특정 필드만 골라서 조회
                id: true,
                name: true,
                price: true,
                createdAt: true,
            }
        })
        res.status(200).json(products);
    })


    app.listen(3000, () => {
        console.log(`${PORT}에서 서버 실행 중`)
    })


    


productRouter.route('/products/:id')
//상품 상세 조회 API (id, name, description, price, tags, createdAt를 조회)
    .get( async(req,res) => {
        const { id } = req.params // 리퀘스트 URL 파라미터에서 id 추출 (구조분해)

        const product = await prisma.product.findUnique({
            where: { id },
            select: {  // 모델에서 필요한 필드만 선택
                id: true,
                name: true,
                description: true,
                price: true,
                tags: true,
                createdAt: true
            }
        })

        if (!product) { // 실행결과가 없다면
            return res.status(404).json({message: '해당 상품을 찾을 수 없습니다.'})
        }
        res.status(200).json(product);
    })
    //상품 수정 API (PATCH 메서드를 사용)
    .patch( async(req,res) => { 
        const { id } = req.params

        try{
            const updateProductData = PatchProduct.parse(req.body)

            const Product = await prisma.product.update({
                where: { id },
                data: updateProductData,
            });
        res.status(200).json(Product) // 수정된 상품내용을 클라이언트에게 전달
        } catch (error) { 
            if (error instanceof z.ZodError) {
                res.status(404).json({message: "해당 상품을 찾을 수 없습니다."})
            } else {
                res.status(500).json({ message : '서버 오류가 발생했거나 상품을 찾을 수 없습니다.'})
            }
        }   
    })

    //상품 삭제 API
    .delete( async(req,res) => {
        const { id } = req.params
        
        try{
            await prisma.product.delete({
                where: { id },
            })
            res.status(204).json({message: '성공적으로 삭제 되었습니다.'}); // 삭제 성공
        } catch (error) {
            res.status(404).json({ message: "해당 상품을 찾을 수 없습니다."})
        }
    });


app.use(productRouter)