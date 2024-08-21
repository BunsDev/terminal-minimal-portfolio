import { db } from '@/lib/prisma'
import { auth } from '@/lib/auth'

import { Drag } from './_components/drag'

export default async function GuestBook() {
  const [posts, session] = await Promise.all([
    db.post.findMany({ include: { user: true, like: { select: { user: { select: { id: true } } } }, _count: { select: { like: true } } }, orderBy: { createdAt: 'desc' } }),
    auth()
  ])

  return (
    <div className='w-full h-full'>
      {posts.slice(0, 5).map(item => (
        <Drag key={item.id}>
          <div className='bg-[#444444] relative w-56 h-72 rounded-md shadow-lg shadow-black/20 hover:shadow-md transition-shadow'>
            {/* <div */}
            {/*   className='opacity-[4%] absolute top-0 left-0 w-full h-full' */}
            {/*   style={{ backgroundImage: "url('https://framerusercontent.com/images/rR6HYXBrMmX4cRpXfXUOvpvpB0.png')", backgroundRepeat: 'repeat' }} */}
            {/* /> */}
          </div>
        </Drag>
      ))}
    </div>
  )
}
