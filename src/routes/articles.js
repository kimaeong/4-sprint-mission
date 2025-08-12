import express from 'express'
import { PrismaClient } from '@prisma/client'
import { createArticle, patchArticle } from '.../validate.js' // 유효성 검사 가져오기

const prisma = new PrismaClient // 클래스라서 new 키워드로 인스턴스를 만듦

const app = express()
app.use(express.json())

const ArticleRouter = express.Router

/*************article***************/


ArticleRouter.route('/articles') // 라우트
// 1. 게시글 등록 API (title, content를 입력해 게시글을 등록)
    .post(async(req, res) => {
        try{  // 유효성 검사를 위한 try catch문
            const newArticleData = createArticle.parse(req.body) // 정의한 함수로 요청 본문 유효성 검사
            // parse: Zod 라이브러리 함수, 데이터의 유효성을 검사 -> 성공하면 그 데이터를 반환하는 역할
            
            const article = await prisma.article.create({
                data: newArticleData
            })
            res.status(201).json(article) //생성 시 201 상태 코드, 등록한 게시글 내용 전달
        }catch (error) { // 유효성 검사 실패 시,  // error : try 문에서 발생한 에러를 전달 받은 값
            if(error instanceof z.ZodError) { // 만약 try에서 전달 받은 error가 유효성 검사에서 실패한 경우라면
                                            // z.ZodError: Zod가 유효성 검사 실패 시 자동으로 생성하는 오류 클래스의 이름,  instanceof: 왼쪽의 객체가 오른쪽의 클래스로부터 만들어졌니? true라면, 요청 데이터의 유효성 검사에서 문제가 생긴 것
                res.status(400).json ({ error: error.errors}) // error.errors : 여러 개의 오류 메시지 목록을 클라이언트에게 전달하기 위해 사용
            } else { // 유효성 이외의 모든 에러
                res.status(500).json({ message: "서버 오류가 발생했습니다."})
            }
        }
    })
// 2. 게시글 목록 조회 API 
/*id, title, content, createdAt를 조회
offset 방식의 페이지네이션 기능을 포함
최신순(recent)으로 정렬
title, content에 포함된 단어로 검색 가능 */
    .get(async(req, res) => {
        const { offset = 0, limit =10, order = 'recent', keyword = '' } = req.query
        let orderBy
        switch (order) {
            case 'old' :
                orderBy =  { createdAt : 'asc' }
                break
            case 'recent' :
                orderBy = { createdAt : 'desc' }
        }

        const where = keyword 
        ? {
            OR : [
                {title : { contains: keyword, mode: 'insensitive'}},
                {content: { contains: keyword, mode: 'insensitive'}}
            ]
        }
        : {}


        const articles = await prisma.article.findMany({
            where,
            orderBy,
            skip: parseInt(offset),
            take: parseInt(limit),
            select: {
                id: true,
                title: true,
                content: true,
                createdAt: true
            }
        })
        res.status(200).json(articles)
    })




ArticleRouter.route('/articles/:id')
// 3.게시글 상세 조회 API (id, title, content, createdAt를 조회)
    .get( async(req, res) => {
        const { id } = req.params  // URL에서 id 추출
        const article = await prisma.article.findUnique({
            where :  {id}, // 해당 id의 게시글을 조회
            select: {
                title: true,
                content: true,
                createdAt: true 
            }
        })
        
        if(!article) { // 유효성 검사 : 만약 게시글을 찾을 수 없다면
            return res.status(400).json({message:'게시글을 찾을 수 없습니다.'})
        }
        res.status(200).json(article)
    })


// 4. 게시글 수정 API를 만들어 주세요.
    .patch( async(req, res) => {
        const { id } = req.params
        try{ 
            const updateArticleData = patchArticle.parse(req.body)
        
            const article =  await prisma.article.update({
                where : {id},
                data: updateArticleData
            })
        res.status(200).json(article)
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ errors: error.errors })
            } else {
                res.status(500).json({ message: '서버 오류가 발생했거나, 게시글을 찾을 수 없습니다.'})
            }
        }
    
    })

// 5. 게시글 삭제 API를 만들어 주세요.
    .delete( async(req, res) => {
            const { id } = req.params
            
            try{
                await prisma.article.delete({
                    where: { id },
                })
                res.Status(200).json({ message : "게시글이 삭제 되었습니다 "})
            } catch (error) {
                res.status(404).json({ message: '삭제할 게시글을 찾을 수 없습니다.'})
            }
        }) 

app.use(ArticleRouter)