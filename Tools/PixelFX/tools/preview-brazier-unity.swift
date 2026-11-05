// Native Unity-capture GIF + same-phase comparison, no ffmpeg dependency.
import Foundation
import ImageIO
import CoreGraphics

let folder=URL(fileURLWithPath:CommandLine.arguments[1])
func read(_ path:URL)->CGImage {
    guard let source=CGImageSourceCreateWithURL(path as CFURL,nil),let image=CGImageSourceCreateImageAtIndex(source,0,nil) else {fatalError("Missing "+path.path)}
    return image
}
let output=folder.appendingPathComponent("BrazierAnimated.gif")
guard let destination=CGImageDestinationCreateWithURL(output as CFURL,"com.compuserve.gif" as CFString,90,nil) else {fatalError("GIF output unavailable")}
CGImageDestinationSetProperties(destination,[kCGImagePropertyGIFDictionary:[kCGImagePropertyGIFLoopCount:0]] as CFDictionary)
for i in 0..<90 {
    let image=read(folder.appendingPathComponent(String(format:"Motion/Frame_%03d.png",i)))
    CGImageDestinationAddImage(destination,image,[kCGImagePropertyGIFDictionary:[kCGImagePropertyGIFDelayTime:1.0/30,kCGImagePropertyGIFUnclampedDelayTime:1.0/30]] as CFDictionary)
}
guard CGImageDestinationFinalize(destination) else {fatalError("GIF export failed")}
let reference=read(URL(fileURLWithPath:CommandLine.arguments[2]))
let unity=read(folder.appendingPathComponent("SourcePhase_0.8.png"))
let context=CGContext(data:nil,width:896,height:592,bitsPerComponent:8,bytesPerRow:896*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
context.interpolationQuality = .none
context.draw(reference,in:CGRect(x:0,y:0,width:448,height:592))
context.draw(unity,in:CGRect(x:448,y:0,width:448,height:592))
let compare=folder.appendingPathComponent("SourceLeft_UnityRight.png")
let png=CGImageDestinationCreateWithURL(compare as CFURL,"public.png" as CFString,1,nil)!
CGImageDestinationAddImage(png,context.makeImage()!,nil)
guard CGImageDestinationFinalize(png) else {fatalError("Comparison export failed")}
print(output.path)
print(compare.path)
