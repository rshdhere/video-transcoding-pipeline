import { S3 } from "@/s3/client.js";
import { publicProcedure, router } from "@/trpc.js";
import { getUploadURLTypes } from "@/types/index.js";
import { AWS_BUCKET_NAME } from "@/config/config.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const videoRouter = router({
  getUploadUrl: publicProcedure
    .input(getUploadURLTypes.input)
    .mutation(
      async ({ input }) => {

        const key = `uploads/${Date.now()}-${input.fileName}`

        const command = new PutObjectCommand({
          Bucket: AWS_BUCKET_NAME,
          Key: key,
          ContentType: input.fileType,
          Metadata: {
            title: input.title,
            description: input.description
          }
        })

        const presignedUrl = await getSignedUrl(S3, command, {
          expiresIn: 60
        })

        return {
          presignedUrl,
          key
        }

      }
    )

})
