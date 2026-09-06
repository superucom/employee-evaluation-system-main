# ระบบประเมินผลการปฏิบัติงานพนักงาน

ระบบจัดการรอบประเมิน ผู้ประเมิน ผู้ถูกประเมิน แบบประเมิน คะแนน และรายงานผลการประเมิน พัฒนาด้วย Next.js, TypeScript, Prisma และ PostgreSQL/Neon

ระบบนี้ใช้การประเมิน **1 ครั้งต่อพนักงานใน 1 รอบประเมิน** ไม่ใช่การประเมินรายวัน 20 วัน

## เทคโนโลยีที่ใช้

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- PostgreSQL โดยแนะนำ Neon
- Prisma ORM
- Auth.js v5 แบบ Username/Password
- bcryptjs สำหรับเข้ารหัสรหัสผ่าน
- Zod สำหรับตรวจสอบข้อมูล
- Vitest สำหรับทดสอบระบบ

## โครงสร้างคะแนนขององค์กร

คะแนนเต็มทั้งหมดของการประเมินองค์กรคือ **100 คะแนน**

| ส่วนคะแนน | คะแนนเต็ม | สถานะการรองรับ |
|---|---:|---|
| คะแนนจากการทำงาน | 65 | หัวข้อการทำงานอาจแตกต่างกันตามแผนก |
| คะแนนจากพฤติกรรม | 20 | ใช้หมวดคำถามพฤติกรรมขององค์กร |
| คะแนนประเมินจากหัวหน้างาน | 15 | ระบบมอบหมายผู้ประเมินและคำนวณสัดส่วนส่วนนี้ |

> คะแนน 15 คะแนนเป็นเพียงส่วนหนึ่งของคะแนนเต็ม 100 คะแนน ไม่ควรนำ 15 คะแนนไปตัดเกรดเป็น 100% โดยตรง

## สัดส่วนผู้ประเมิน 15 คะแนน

ระบบใช้กฎการมอบหมายอัตโนมัติตาม Role, ทีม, แผนก, ตำแหน่ง และกลุ่มเป้าหมาย

| กลุ่มผู้ถูกประเมิน | ผู้ประเมินและคะแนน |
|---|---|
| Head | Super 10 + Support Super 5 |
| Support Head | Super 5 + Support Super 2.5 + Head แผนกเดียวกัน 7.5 |
| Transfer / QA | Super 5 + Support Super 2.5 + Head แผนกเดียวกัน 7.5 |
| Staff รวม SalePromotion (SP) | Super 5 + Support Super 2.5 + Head 6.25 + Support Head 1.25 |
| Staff แผนก CR | Super.CR 2.5 + Super ที่เลือกประจำรอบ 2.5 + Support Super ที่เลือกประจำรอบ 2.5 + Head CR ทีม A/B/C ทีมละ 2.5 |

ข้อกำหนดสำคัญ:

- Super ไม่ประเมิน Super คนอื่น
- Support Super ไม่ประเมิน Super
- Head ประเมิน Support Head และ Staff ในแผนก/ทีมที่เกี่ยวข้อง
- Support Head ประเมิน Staff ในแผนก/ทีมของตัวเอง
- Head CR ประเมิน Staff CR จากทั้ง 3 ทีม
- ผู้ประเมิน CR ที่เป็น Super.CR, Super และ Support Super สามารถเปลี่ยนได้ตามรอบประเมิน
- คะแนนของแต่ละกลุ่มต้องรวมเป็น 15 คะแนน

## Role ในระบบ

| Role | หน้าที่หลัก |
|---|---|
| Manager | จัดการข้อมูลทั้งหมด ตั้งค่ารอบ กฎ ผู้ใช้งาน และรายงาน |
| Super | ประเมินผู้ปฏิบัติงานในทีมของตัวเองตามสิทธิ์ที่ระบบสร้าง |
| Support Super | ประเมินผู้ปฏิบัติงานในทีมของตัวเองตามสิทธิ์ที่ระบบสร้าง |
| Head | ประเมิน Support Head และ Staff ในแผนก/ทีมของตัวเอง รวมถึง Head CR ตามกฎ |
| Support Head | ประเมิน Staff ในแผนก/ทีมของตัวเอง |
| Super.CR | ประเมิน Staff CR ตามสิทธิ์ที่เลือกในรอบ |
| Evaluator | บัญชีผู้ประเมินทั่วไปสำหรับกรณีที่กำหนดสิทธิ์เพิ่มเติม |

## การติดตั้งสำหรับเครื่องพัฒนา

### สิ่งที่ต้องมี

- Node.js แนะนำเวอร์ชัน LTS 20 ขึ้นไป
- npm
- PostgreSQL หรือ Neon Database
- Git สำหรับจัดเก็บ Source Code

### ติดตั้งแพ็กเกจ

```bash
npm install
```

### ตั้งค่า Environment Variables

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจริง

```env
DATABASE_URL="postgresql://username:password@host:5432/employee_evaluation?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://username:password@host:5432/employee_evaluation?sslmode=require"
AUTH_SECRET="ใส่ค่าลับที่สุ่มใหม่"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

สร้าง `AUTH_SECRET` ใหม่ได้ด้วยคำสั่ง:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

ข้อควรระวัง:

- ห้าม Commit `.env.local`
- ห้ามนำ `DATABASE_URL` หรือ `AUTH_SECRET` ไปใส่ในตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_`
- `DATABASE_URL` เป็นความลับและใช้เชื่อมต่อฐานข้อมูลโดยตรง

### สร้างตารางฐานข้อมูล

สร้าง Prisma Client:

```bash
npx prisma generate
```

ถ้าเป็นฐานข้อมูลใหม่หรือฐานข้อมูลสำหรับ Development ให้ใช้:

```bash
npx prisma db push
```

โปรเจกต์ปัจจุบันยังไม่มีโฟลเดอร์ `prisma/migrations` ดังนั้นไม่ควรใช้ `prisma migrate deploy` จนกว่าจะมี Migration ที่สร้างและตรวจสอบแล้ว

> `prisma/seed.ts` เป็นข้อมูลตัวอย่างสำหรับฐานข้อมูลว่างเท่านั้น ควรตรวจสอบข้อมูลในไฟล์ก่อนใช้ และไม่ควรรัน Seed ซ้ำบนฐานข้อมูลที่มีข้อมูลจริง

### เริ่มระบบ

```bash
npm run dev
```

เปิดเว็บที่:

```text
http://localhost:3000
```

## วิธีใช้งานหน้าเว็บสำหรับ Manager

ให้เข้าสู่ระบบด้วยบัญชีที่มี Role `MANAGER` จากนั้นทำงานตามลำดับนี้

### 1. Dashboard

เส้นทาง: `/dashboard`

ใช้ดูภาพรวมจำนวนพนักงาน ผู้ประเมิน แผนก รอบประเมิน และรายการที่ส่งผลแล้ว

### 2. ทีมและแผนก

เส้นทาง: `/teams`

ใช้จัดการโครงสร้างองค์กร:

1. ตรวจสอบหรือสร้างแผนก
2. ตรวจสอบหรือสร้างทีมหลัก เช่น ทีม A, ทีม B, ทีม C
3. ตรวจสอบทีมย่อยภายใต้แผนก
4. ตรวจสอบจำนวนพนักงานในแต่ละทีม

ควรจัดโครงสร้างทีมและแผนกให้เสร็จก่อนเพิ่มผู้ใช้งานที่เป็นผู้ประเมิน เพราะระบบใช้ข้อมูลเหล่านี้สร้างสิทธิ์อัตโนมัติ

### 3. พนักงาน

เส้นทาง: `/employees`

เพิ่มหรือแก้ไขข้อมูล:

- รหัสพนักงาน
- ชื่อจริง
- ชื่อเล่น
- แผนก
- ทีมหลัก
- ตำแหน่ง
- สถานะการทำงาน

ตำแหน่งมีผลต่อการจัดกลุ่มผู้ถูกประเมิน เช่น Head, Support Head, Transfer, QA, CR และ Staff

### 4. ผู้ใช้งาน

เส้นทาง: `/users`

เพิ่มบัญชีผู้ใช้งานพร้อมกำหนด:

- Username
- ชื่อ-นามสกุลหรือชื่อแสดงผล
- Role
- แผนก
- ทีม
- สถานะการใช้งาน

เมื่อเพิ่มหรือแก้ไขบัญชีผู้ประเมิน ระบบจะ Sync สิทธิ์การประเมินอัตโนมัติตาม Role, ทีม, แผนก และกฎการประเมิน

ผู้ใช้งานที่ถูกสร้างด้วย `mustChangePassword` จะต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก

### 5. รอบการประเมิน

เส้นทาง: `/evaluation-periods`

สร้างรอบประเมินโดยกำหนด:

- ชื่อรอบ
- ประเภทของรอบ
- วันที่เริ่มต้น
- วันที่สิ้นสุด
- จำนวนวันทำงานที่คาดหวัง
- สถานะรอบ

การตั้งค่าปัจจุบันคือประเมิน **1 ครั้งต่อพนักงานใน 1 รอบ** ไม่ต้องสร้างรายการประเมินแยกรายวัน

สถานะรอบที่ใช้บ่อย:

- `DRAFT`: กำลังเตรียมข้อมูล
- `ACTIVE`: เปิดให้ประเมิน
- `LOCKED`: ล็อกผล ไม่ให้แก้ไขตามปกติ
- `CLOSED`: ปิดรอบ

### 6. หมวดหมู่และคำถาม

เส้นทาง:

- `/evaluation-criteria/categories`
- `/evaluation-criteria/questions`

ตั้งค่าหมวดหมู่และคำถามที่ผู้ประเมินจะเห็น โดยแยกหมวดให้ตรงกับกลุ่มเป้าหมาย เช่น:

- การประเมิน Head / SupHead / Transfer / QA
- การประเมินพนักงาน
- หมวดพฤติกรรม

การเปลี่ยนคำถามควรทำก่อนเปิดรอบประเมิน และไม่ควรแก้คำถามของรอบที่ล็อกแล้ว

### 7. เกณฑ์คะแนนและเกรด

เส้นทาง:

- `/evaluation-criteria/score-criteria`
- `/evaluation-criteria/grades`

หน้าเกณฑ์คะแนนใช้ดู:

- คะแนนประเมินจากหัวหน้างาน 15 คะแนน
- สัดส่วนคะแนนของแต่ละผู้ประเมิน
- คะแนนแบบประเมินระดับ 1 ถึง 5

หน้าเกรดใช้กำหนดช่วงคะแนนและ Label ของเกรด เช่น A, B, C, D หรือเกรดอื่นตามนโยบายองค์กร

### 8. กฎการประเมินและผู้ประเมิน CR

เส้นทาง: `/evaluation-rules`

หน้านี้ใช้สำหรับ:

- เปลี่ยนคะแนนของผู้ประเมินในแต่ละกลุ่มเป้าหมาย
- เปิด/ปิดกฎการประเมิน
- ตรวจสอบหมวดคำถามของกฎ
- เลือก Super.CR ประจำรอบ
- เลือก Super ที่ใช้ประเมิน CR ประจำรอบ
- เลือก Support Super ที่ใช้ประเมิน CR ประจำรอบ

เมื่อกดบันทึก ระบบจะ Sync สิทธิ์การประเมินอัตโนมัติให้กับรอบที่ยังเปิดอยู่

คะแนนรวมของแต่ละกลุ่มต้องเท่ากับ 15 คะแนน มิฉะนั้นระบบจะไม่อนุญาตให้บันทึก

### 9. ตรวจสอบการมอบหมาย

เส้นทาง: `/evaluator-assignments`

ใช้ตรวจสอบว่า:

- ใครเป็นผู้ประเมิน
- ใครเป็นผู้ถูกประเมิน
- อยู่ในหมวดคำถามใด
- อยู่ในรอบใด
- ได้รับน้ำหนักกี่คะแนน
- เป็นการมอบหมายอัตโนมัติหรือกำหนดเอง

ระบบจะแสดงผู้ถูกประเมินในรูปแบบ:

```text
ชื่อจริง ชื่อเล่น (รหัสพนักงาน)
```

ไม่ควรสร้างการมอบหมายซ้ำด้วยตนเอง หาก Role, ทีม และแผนกของผู้ใช้งานถูกต้อง เพราะระบบจะสร้างสิทธิ์อัตโนมัติให้แล้ว

### 10. การประเมินผล

เส้นทาง:

- `/my-employees`: แบบประเมินที่ผู้ใช้งานมีสิทธิ์ทำ
- `/evaluations`: รายการผลการประเมินและสถานะ
- `/evaluations/pending`: รายการที่ยังค้างอยู่
- `/evaluations/history`: ประวัติการประเมิน

ผู้ประเมินควรตรวจสอบรอบประเมินและรายชื่อผู้ถูกประเมินก่อนกรอกคะแนน เมื่อบันทึกหรือส่งผลแล้ว ระบบจะเก็บผู้ประเมิน รอบ และคะแนนไว้กับรายการนั้น

### 11. รายงาน

เส้นทาง:

- `/reports/matrix`: แปลผลคะแนนรวมตามกลุ่มและผู้ประเมิน พร้อม Export Excel
- `/reports/performance`: รายงานผลการประเมินรายบุคคล/รายกลุ่ม
- `/reports/completion`: ตรวจสอบว่าพนักงานได้รับคะแนนครบ 15 คะแนนหรือยัง
- `/audit-logs`: ตรวจสอบประวัติการสร้าง แก้ไข ล็อก ส่งผล และการเปลี่ยนแปลงสำคัญ

ก่อน Export ควรเลือก รอบประเมิน ทีม และแผนกให้ถูกต้อง

## วิธีใช้งานสำหรับผู้ประเมิน

1. เปิดหน้า Login
2. เข้าด้วย Username และ Password ที่ Manager สร้างให้
3. หากระบบแจ้งให้เปลี่ยน Password ให้เปลี่ยนก่อนใช้งาน
4. เปิดเมนู `ประเมินผลพนักงาน` หรือ `พนักงานของฉัน`
5. เลือกรอบประเมิน
6. ตรวจสอบรายชื่อผู้ถูกประเมินและหมวดคำถาม
7. ให้คะแนนทุกข้อและตรวจสอบความคิดเห็น
8. บันทึกแบบร่างหรือส่งผลตามขั้นตอนของระบบ
9. ตรวจสอบรายการที่ค้างในหน้า `ผลการประเมิน`

ผู้ประเมินจะเห็นเฉพาะรายการที่ได้รับสิทธิ์ ไม่ควรใช้การแก้ไขหน้าเว็บเพื่อเข้าถึงพนักงานนอกสิทธิ์ เพราะ API ตรวจสอบสิทธิ์ซ้ำอีกชั้นหนึ่ง

## การตรวจสอบก่อนเปิดใช้งานจริง

รันคำสั่งต่อไปนี้ก่อน Deploy:

```bash
npm run test:run
npm exec -- tsc --noEmit
npm run build
```

ถ้า Build ผ่าน ให้ทดสอบอย่างน้อย:

- Login Manager
- Login ผู้ประเมินแต่ละ Role
- เปลี่ยน Password ครั้งแรก
- สร้างรอบประเมิน
- เพิ่ม/แก้ไขพนักงาน
- เพิ่ม/แก้ไขผู้ประเมิน
- Sync การมอบหมาย
- ตรวจคะแนนรวม 15 คะแนน
- เลือกผู้ประเมิน CR ประจำรอบ
- ส่งแบบประเมิน
- ตรวจ Completion Report
- Export Excel
- ล็อกรอบประเมิน

## Deploy ขึ้น Vercel

### ข้อควรระวังก่อน Push Code

โปรเจกต์มีข้อมูลลับใน `.env.local` ดังนั้นต้องตรวจสอบก่อนว่าไฟล์นี้ไม่ถูก Track:

```bash
git status --short
```

ไฟล์ `.gitignore` ของโปรเจกต์จะกันไฟล์ต่อไปนี้ไม่ให้ถูก Commit:

- `.env.local`
- `.env.production`
- `.env.development`
- `node_modules`
- `.next`
- `.vercel`

### วิธีที่แนะนำ: GitHub Integration

1. สร้าง Repository ส่วนตัวบน GitHub
2. Push โปรเจกต์ขึ้น GitHub:

```bash
git init
git add .
git commit -m "Prepare project for Vercel"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

3. เข้า [Vercel](https://vercel.com)
4. เลือก `Add New` → `Project`
5. เลือก Repository จาก GitHub
6. ตั้งค่าโปรเจกต์:

```text
Framework Preset: Next.js
Root Directory: /
Install Command: npm install
Build Command: npm run build
```

ไม่ต้องกำหนด Output Directory เพราะ Vercel ตรวจจับ Next.js ให้เอง

### Environment Variables บน Vercel

ไปที่ `Project Settings` → `Environment Variables` แล้วเพิ่ม:

```env
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
AUTH_SECRET=...
NEXT_PUBLIC_APP_URL=https://ชื่อโปรเจกต์.vercel.app
```

คำแนะนำ:

- ใช้ Neon pooled connection string ที่มีคำว่า `-pooler` เป็น `DATABASE_URL`
- ตั้ง `AUTH_SECRET` เป็นค่าใหม่เฉพาะ Production
- ตั้งค่า Environment เป็น Production และ Preview ตามความจำเป็น
- อย่าใส่ Secret ในโค้ดหรือในตัวแปร `NEXT_PUBLIC_*`
- เมื่อแก้ Environment Variables แล้ว ต้อง Redeploy อีกครั้ง

### เตรียมฐานข้อมูล Production

ถ้า Vercel ใช้ Neon Database เดิมที่มีข้อมูลอยู่แล้ว ให้ตั้ง `DATABASE_URL` ให้ชี้ไปยังฐานข้อมูลเดียวกัน

ถ้าเป็นฐานข้อมูลใหม่ ให้ Push Schema เพียงครั้งแรก:

```bash
npx prisma db push
```

ควรตรวจสอบชื่อ Database และข้อมูลก่อนใช้คำสั่งนี้เสมอ เพราะ `db push` จะปรับโครงสร้างตารางให้ตรงกับ Prisma Schema

ไม่ควรรันคำสั่งต่อไปนี้บน Production โดยไม่ตรวจสอบข้อมูล:

```bash
npm run db:seed
```

เพราะ Seed อาจสร้างข้อมูลตัวอย่างหรือข้อมูลซ้ำ

### Deploy ด้วย Vercel CLI

ใช้เมื่อไม่ต้องการเชื่อม GitHub หรือใช้สำหรับทดสอบอย่างรวดเร็ว:

```bash
npm install -g vercel
vercel login
vercel link
vercel
```

คำสั่ง `vercel` จะสร้าง Preview Deployment

เมื่อทดสอบ Preview ผ่านแล้ว Deploy Production:

```bash
vercel --prod
```

คำสั่งที่ใช้ตรวจสอบ Deployment:

```bash
vercel ls
vercel inspect <deployment-url>
vercel logs <deployment-url>
```

ถ้าต้องการย้อนกลับไปยัง Deployment ก่อนหน้า:

```bash
vercel rollback
```

## การตั้งค่า Preview และ Production Database

แนะนำให้ใช้ Neon คนละ Branch หรือคนละ Database สำหรับ Preview และ Production เพื่อไม่ให้การทดสอบแก้ข้อมูลจริง

| Environment | ฐานข้อมูลที่แนะนำ |
|---|---|
| Development | Neon Development หรือ Local PostgreSQL |
| Preview | Neon Preview Branch |
| Production | Neon Production Database |

## Troubleshooting

### `Can't reach database server`

ตรวจสอบ:

1. `DATABASE_URL` บน Vercel ถูกต้องหรือไม่
2. Connection String มี `sslmode=require` หรือไม่
3. ใช้ Connection String ของ Neon ที่ถูกต้องหรือไม่
4. Database ยังใช้งานได้หรือไม่
5. มีการแก้ Environment Variables แล้ว Redeploy หรือยัง

### `PrismaClientInitializationError`

ตรวจสอบว่า:

```bash
npx prisma generate
npm run build
```

และตรวจว่าตัวแปร `DATABASE_URL` ถูกตั้งใน Environment ของ Vercel ครบทุก Environment ที่ใช้งาน

### Login ไม่ได้หลัง Deploy

ตรวจสอบ:

- `AUTH_SECRET` มีค่าและไม่เปลี่ยนไปมาระหว่าง Deployment
- ฐานข้อมูลมี User อยู่จริง
- User มี `isActive = true`
- User ไม่ได้ถูกลบแบบ Soft Delete
- Browser อนุญาต Cookies

### Server Action หรือ Origin Error

ถ้าใช้ Custom Domain แล้วพบ Error จาก Server Action ให้ตรวจสอบ `allowedOrigins` ใน `next.config.ts` และเพิ่ม Domain จริงของเว็บไซต์ตามความจำเป็น

### ข้อมูลหายหลัง Deploy

Vercel ไม่ได้เก็บข้อมูลในตัว Application Files ข้อมูลทั้งหมดอยู่ใน PostgreSQL/Neon ดังนั้นให้ตรวจสอบว่า Production ใช้ `DATABASE_URL` ของฐานข้อมูลที่ถูกต้อง ไม่ใช่ฐานข้อมูล Development หรือฐานข้อมูลใหม่ว่างเปล่า

## คำสั่งที่ใช้บ่อย

```bash
# เริ่ม Development Server
npm run dev

# สร้าง Prisma Client
npm run db:generate

# Push Schema สำหรับ Development
npm run db:push

# รัน Unit Tests
npm run test:run

# ตรวจ TypeScript
npm exec -- tsc --noEmit

# Build แบบ Production
npm run build

# เริ่ม Production Server ในเครื่อง
npm run start
```

## ความปลอดภัย

- เปลี่ยนรหัสผ่าน Manager หลังติดตั้ง
- ให้ผู้ใช้งานเปลี่ยน Password ครั้งแรก
- อย่าใช้รหัสผ่านเดียวกันในทุก Environment
- อย่า Commit `.env.local`
- จำกัดสิทธิ์ Database ให้เหมาะสม
- สำรองข้อมูล Neon ก่อนเปลี่ยน Schema ครั้งใหญ่
- ตรวจสอบ Audit Log เมื่อมีการแก้ไขกฎหรือคะแนน
