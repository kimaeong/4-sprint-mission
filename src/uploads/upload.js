import multer from 'multer'; // multer 라이브러리를 가져오기: 파일을 업로드하는 데 사용

const upload = milter({ dest : 'uploads/'}) // dest 옵션으로 파일이 uploads 위치에 저장되더록 정함

app.post('/files', upload.single('attachment'), (req,res) => { // 하나의 파일을 받는 single 메소드로 파일을 attachment 필드로 받음
    const path = `/files'${req.file.filename}`
    res.json({ path })
})

// 다른 파일에서 이 `upload` 미들웨어를 가져다 쓸 수 있게 내보내기
export default upload;

