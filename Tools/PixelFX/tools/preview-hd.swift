// Native macOS animated preview, no ffmpeg dependency.
// swift tools/preview-hd.swift output/hd/cyan-cleave
import Foundation
import ImageIO
import CoreGraphics

let folder = URL(fileURLWithPath: CommandLine.arguments[1])
let size = 768
var images: [CGImage] = []
// Use 30 fps for GIF compatibility. The game-ready PNGs remain at 60 fps.
for i in stride(from: 0, through: 24, by: 2) {
    let url = folder.appendingPathComponent(String(format: "frames/cleave-%03d.png", i))
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
          let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
                              bytesPerRow: size * 4, space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
        fatalError("Cannot read frame")
    }
    ctx.setFillColor(CGColor(red: 0.06, green: 0.09, blue: 0.12, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
    ctx.interpolationQuality = .high
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
    images.append(ctx.makeImage()!)
}
let destinationURL = folder.appendingPathComponent("preview.gif")
guard let destination = CGImageDestinationCreateWithURL(destinationURL as CFURL, "com.compuserve.gif" as CFString, images.count, nil) else {
    fatalError("Cannot write GIF")
}
CGImageDestinationSetProperties(destination, [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0]] as CFDictionary)
for (i, image) in images.enumerated() {
    let delay = i == images.count - 1 ? 0.55 : 1.0 / 30.0
    CGImageDestinationAddImage(destination, image,
        [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFDelayTime: delay,
                                       kCGImagePropertyGIFUnclampedDelayTime: delay]] as CFDictionary)
}
guard CGImageDestinationFinalize(destination) else { fatalError("GIF export failed") }
print(destinationURL.path)
